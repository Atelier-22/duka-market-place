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
  // Treat a blank email the same as no email — an empty string would collide
  // with every other blank on the UNIQUE index.
  const email = input.email?.trim() ? normalizeEmail(input.email) : null;

  // Uniqueness is per role: the same phone/email may already be in use by the
  // other role's account, and that is allowed — it is what makes the two
  // accounts switchable later.
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
  // A duplicate that races past the checks above surfaces as a Postgres 23505,
  // which errorHandler maps to the same 409 rather than a 500.
  const user = await createUser({
    role: input.role,
    fullName: input.fullName.trim(),
    email,
    phone,
    passwordHash,
  });

  // A sibling account may already exist under the other role. Linking it here
  // means the toggle is available immediately after signing up, without a
  // second login.
  const linked = await proveLinkedAccounts(user, input.password);

  res.status(201).json({
    user: toPublicUser(user),
    linkedAccounts: linked.map(toLinkedAccount),
    ...issueTokens(user, linked),
  });
}

/**
 * Of the accounts that look like they belong to this person, return only the
 * ones the supplied password actually opens.
 *
 * Matching on email alone would be an account-takeover hole: registering a
 * shopper account with someone else's email would otherwise hand you their
 * customer account. Requiring the password to verify against both sides means
 * a link can only be formed by someone who can already log into both.
 */
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

  // Phone is unique per role, not globally, so this can return both the
  // customer and the shopper account. The password decides which are ours.
  const candidates = await findUsersByPhone(input.phone);
  const matches = await Promise.all(
    candidates.map(async (c) => ((await verifyPassword(input.password, c.password_hash)) ? c : null))
  );
  const owned = matches.filter((c): c is UserRow => c !== null);

  if (owned.length === 0) throw new ApiError(401, 'Invalid phone number or password');

  const active = owned.filter((u) => u.is_active);
  if (active.length === 0) throw new ApiError(403, 'This account has been deactivated');

  // When one password opens both accounts, land on the customer side and let
  // the toggle move them across; it is the more common entry point.
  const user = active.find((u) => u.role === 'customer') ?? active[0];
  const linked = await proveLinkedAccounts(user, input.password);

  res.json({
    user: toPublicUser(user),
    linkedAccounts: linked.map(toLinkedAccount),
    ...issueTokens(user, linked),
  });
}

const switchAccountSchema = z.object({ userId: z.string().uuid() });

/**
 * Swap the session over to a sibling account without a fresh login. Only ids
 * that were password-proven at login are in the token's `linked` list, so this
 * cannot be used to reach an account the caller never authenticated against.
 */
export async function switchAccount(req: Request, res: Response) {
  const { userId } = switchAccountSchema.parse(req.body);

  if (!req.user!.linked.includes(userId)) {
    throw new ApiError(403, 'That account is not linked to this session — log in to it directly');
  }

  const target = await findUserById(userId);
  if (!target) throw new ApiError(404, 'Linked account no longer exists');
  if (!target.is_active) throw new ApiError(403, 'That account has been deactivated');

  // The account we are leaving becomes a linked account of the new session, so
  // the toggle keeps working in both directions.
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
  // Keep the proven links on the refreshed token, or the toggle would vanish
  // the first time the access token expires.
  const accessToken = signAccessToken(payload.sub, payload.role, payload.linked ?? []);
  res.json({ accessToken });
}

export async function me(req: Request, res: Response) {
  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');

  // Rebuilt from the token rather than re-derived from email, so a reload
  // restores the toggle without re-proving the password.
  const linkedRows = (await Promise.all(req.user!.linked.map(findUserById))).filter(
    (r): r is UserRow => r !== null && r.is_active
  );

  res.json({ user: toPublicUser(user), linkedAccounts: linkedRows.map(toLinkedAccount) });
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

  // Since uniqueness became role-scoped, flipping this row's role would collide
  // with a separate account that already holds it. Point them at the toggle,
  // which is the right tool once two accounts exist.
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
