import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createUser,
  findUserByPhone,
  findUserByEmail,
  findUserById,
  ensureCustomerProfile,
  ensureShopperProfile,
  updateUserRole,
  toPublicUser,
} from '../models/user.model';
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/auth';
import { ApiError } from '../middleware/errorHandler';

const registerSchema = z.object({
  role: z.enum(['customer', 'shopper']),
  fullName: z.string().min(2).max(150),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(9).max(30),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);

  const existing = await findUserByPhone(input.phone);
  if (existing) throw new ApiError(409, 'An account with this phone number already exists');

  if (input.email) {
    const existingEmail = await findUserByEmail(input.email);
    if (existingEmail) {
      throw new ApiError(409, 'An account with this email already exists — try logging in instead');
    }
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    role: input.role,
    fullName: input.fullName,
    email: input.email ?? null,
    phone: input.phone,
    passwordHash,
  });

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, user.role);

  res.status(201).json({ user: toPublicUser(user), accessToken, refreshToken });
}

const loginSchema = z.object({
  phone: z.string().min(9),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const user = await findUserByPhone(input.phone);
  if (!user) throw new ApiError(401, 'Invalid phone number or password');

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) throw new ApiError(401, 'Invalid phone number or password');

  if (!user.is_active) throw new ApiError(403, 'This account has been deactivated');

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, user.role);

  res.json({ user: toPublicUser(user), accessToken, refreshToken });
}

const refreshSchema = z.object({ refreshToken: z.string() });

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
  const accessToken = signAccessToken(payload.sub, payload.role);
  res.json({ accessToken });
}

export async function me(req: Request, res: Response) {
  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: toPublicUser(user) });
}

const switchRoleSchema = z.object({ role: z.enum(['customer', 'shopper']) });

/**
 * One Duka account can act as both a customer and a shopper. Switching flips
 * the role on the user row, lazily creating the side of the profile that
 * doesn't exist yet, and re-issues tokens so the new role is in the JWT.
 */
export async function switchRole(req: Request, res: Response) {
  const { role } = switchRoleSchema.parse(req.body);

  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (role === 'customer') {
    await ensureCustomerProfile(user.id);
  } else {
    await ensureShopperProfile(user.id);
  }

  const updated = await updateUserRole(user.id, role);

  const accessToken = signAccessToken(updated.id, updated.role);
  const refreshToken = signRefreshToken(updated.id, updated.role);

  res.json({ user: toPublicUser(updated), accessToken, refreshToken });
}
