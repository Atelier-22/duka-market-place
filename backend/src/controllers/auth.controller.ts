import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createUser,
  findUsersByPhone,
  findUserByPhoneAndRole,
  findUserByEmailAndRole,
  findSiblingAccounts,
  findUserById,
  UserRow,
  ensureCustomerProfile,
  ensureShopperProfile,
  updateUserRole,
  toPublicUser,
  normalizePhone,
  normalizeEmail,
} from '../models/user.model';
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/auth';
import { findStaffById, findStaffByPhone, toPublicStaff, touchStaffLogin } from '../models/staff.model';
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

  const phone = normalizePhone(input.phone);

  const email = input.email?.trim() ? normalizeEmail(input.email) : null;

  const existing = await findUserByPhoneAndRole(phone, input.role);
  if (existing) {
    throw new ApiError(409, `You already have a ${input.role} account on this phone number — try logging in instead`);
  }

  if (email) {
    const existingEmail = await findUserByEmailAndRole(email, input.role);
    if (existingEmail) {
      throw new ApiError(409, `You already have a ${input.role} account on this email — try logging in instead`);
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await createUser({
    role: input.role,
    fullName: input.fullName.trim(),
    email,
    phone,
    passwordHash,
  });

  const linked = await proveLinkedAccounts(user, input.password);

  res.status(201).json({
    user: toPublicUser(user),
    linkedAccounts: linked.map(toLinkedAccount),
    ...issueTokens(user, linked),
  });
}

async function proveLinkedAccounts(user: UserRow, password: string): Promise<UserRow[]> {
  const siblings = await findSiblingAccounts(user);
  const proven = await Promise.all(
    siblings.map(async (s) => ((await verifyPassword(password, s.password_hash)) ? s : null))
  );
  return proven.filter((s): s is UserRow => s !== null);
}

function issueTokens(user: UserRow, linked: UserRow[]) {
  const linkedIds = linked.map((l) => l.id);
  return {
    accessToken: signAccessToken(user.id, user.role, linkedIds),
    refreshToken: signRefreshToken(user.id, user.role, linkedIds),
  };
}

function toLinkedAccount(row: UserRow) {
  return { id: row.id, role: row.role, fullName: row.full_name };
}

const loginSchema = z.object({
  phone: z.string().min(9),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const staff = await findStaffByPhone(input.phone);
  if (staff && (await verifyPassword(input.password, staff.password_hash))) {
    if (!staff.is_active) throw new ApiError(403, 'This account has been suspended');
    await touchStaffLogin(staff.id);
    return res.json({
      user: toPublicStaff(staff),
      linkedAccounts: [],
      accessToken: signAccessToken(staff.id, staff.role, [], 'staff'),
      refreshToken: signRefreshToken(staff.id, staff.role, [], 'staff'),
    });
  }

  const candidates = await findUsersByPhone(input.phone);
  const matches = await Promise.all(
    candidates.map(async (c) => ((await verifyPassword(input.password, c.password_hash)) ? c : null))
  );
  const owned = matches.filter((c): c is UserRow => c !== null);

  if (owned.length === 0) throw new ApiError(401, 'Invalid phone number or password');

  const active = owned.filter((u) => u.is_active);
  if (active.length === 0) throw new ApiError(403, 'This account has been deactivated');

  const user = active.find((u) => u.role === 'customer') ?? active[0];
  const linked = await proveLinkedAccounts(user, input.password);

  res.json({
    user: toPublicUser(user),
    linkedAccounts: linked.map(toLinkedAccount),
    ...issueTokens(user, linked),
  });
}

const switchAccountSchema = z.object({ userId: z.string().uuid() });

export async function switchAccount(req: Request, res: Response) {
  const { userId } = switchAccountSchema.parse(req.body);

  if (!req.user!.linked.includes(userId)) {
    throw new ApiError(403, 'That account is not linked to this session — log in to it directly');
  }

  const target = await findUserById(userId);
  if (!target) throw new ApiError(404, 'Linked account no longer exists');
  if (!target.is_active) throw new ApiError(403, 'That account has been deactivated');

  const linkedIds = [...req.user!.linked, req.user!.id].filter((id) => id !== target.id);
  const linkedRows = (await Promise.all(linkedIds.map(findUserById))).filter(
    (r): r is UserRow => r !== null
  );

  res.json({
    user: toPublicUser(target),
    linkedAccounts: linkedRows.map(toLinkedAccount),
    accessToken: signAccessToken(target.id, target.role, linkedIds),
    refreshToken: signRefreshToken(target.id, target.role, linkedIds),
  });
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

  const accessToken = signAccessToken(payload.sub, payload.role, payload.linked ?? []);
  res.json({ accessToken });
}

export async function me(req: Request, res: Response) {
  if (req.user!.kind === 'staff') {
    const staff = await findStaffById(req.user!.id);
    if (!staff || !staff.is_active) throw new ApiError(401, 'Session no longer valid');
    return res.json({ user: toPublicStaff(staff), linkedAccounts: [] });
  }

  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');

  const linkedRows = (await Promise.all(req.user!.linked.map(findUserById))).filter(
    (r): r is UserRow => r !== null && r.is_active
  );

  res.json({ user: toPublicUser(user), linkedAccounts: linkedRows.map(toLinkedAccount) });
}

const switchRoleSchema = z.object({ role: z.enum(['customer', 'shopper']) });

export async function switchRole(req: Request, res: Response) {
  const { role } = switchRoleSchema.parse(req.body);

  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');

  const occupied = await findUserByPhoneAndRole(user.phone, role);
  if (occupied && occupied.id !== user.id) {
    throw new ApiError(409, `You already have a separate ${role} account — use the account switcher instead`);
  }

  if (role === 'customer') {
    await ensureCustomerProfile(user.id);
  } else {
    await ensureShopperProfile(user.id);
  }

  const updated = await updateUserRole(user.id, role);

  const linked = req.user!.linked;
  res.json({
    user: toPublicUser(updated),
    accessToken: signAccessToken(updated.id, updated.role, linked),
    refreshToken: signRefreshToken(updated.id, updated.role, linked),
  });
}
