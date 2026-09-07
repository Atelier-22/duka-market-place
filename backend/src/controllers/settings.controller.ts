import { Request, Response } from 'express';
import { z } from 'zod';
import { mediaUrl } from '../utils/validators';
import { getOrCreatePreferences, updatePreferences } from '../models/preferences.model';
import {
  findUserById, findUserByEmailAndRole, findUserByPhoneAndRole,
  normalizeEmail, normalizePhone, toPublicUser,
} from '../models/user.model';
import { queryOne, query } from '../db/pool';
import { hashPassword, verifyPassword } from '../utils/auth';
import { findStaffById, toPublicStaff } from '../models/staff.model';
import { ApiError } from '../middleware/errorHandler';

export async function getPreferences(req: Request, res: Response) {
  res.json({ preferences: await getOrCreatePreferences(req.user!.id) });
}

const preferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),

  accent: z.enum([
    'green', 'ocean', 'sunset', 'grape', 'charcoal',
    'rose', 'amber', 'teal', 'indigo', 'crimson',
    'lime', 'plum', 'sky', 'copper', 'forest', 'slate',
  ]).optional(),
  language: z.enum(['en', 'sw', 'lg']).optional(),
  tone: z.enum(['professional', 'friendly', 'candid', 'efficient', 'encouraging']).optional(),
  traits: z.array(z.string().max(30)).max(8).optional(),
  notifyMessages: z.boolean().optional(),
  notifyOrders: z.boolean().optional(),
  notifyOffers: z.boolean().optional(),
  notifyNewRequests: z.boolean().optional(),
  notifyStoreUpdates: z.boolean().optional(),
  notifyMarketing: z.boolean().optional(),
  shareLocation: z.boolean().optional(),

  locationPromptDismissedAt: z.string().datetime().nullable().optional(),

  notifySecurity: z.boolean().optional(),
  deliveryInstructions: z.string().max(500).nullable().optional(),
  deliveryHandoff: z.enum(['meet', 'gate', 'call']).optional(),
  deliveryContact: z.enum(['call', 'message', 'either']).optional(),
  defaultCity: z.string().max(80).nullable().optional(),
  defaultSourcing: z
    .enum(['specific_market', 'specific_shop', 'social_seller', 'shopper_choice'])
    .nullable()
    .optional(),
});

export async function patchPreferences(req: Request, res: Response) {
  const input = preferencesSchema.parse(req.body);

  const preferences = await updatePreferences(req.user!.id, {
    theme: input.theme,
    accent: input.accent,
    language: input.language,
    tone: input.tone,
    traits: input.traits,
    notify_messages: input.notifyMessages,
    notify_orders: input.notifyOrders,
    notify_offers: input.notifyOffers,
    notify_new_requests: input.notifyNewRequests,
    notify_store_updates: input.notifyStoreUpdates,
    notify_marketing: input.notifyMarketing,
    share_location: input.shareLocation,
    location_prompt_dismissed_at: input.locationPromptDismissedAt,
    notify_security: input.notifySecurity,
    delivery_instructions: input.deliveryInstructions,
    delivery_handoff: input.deliveryHandoff,
    delivery_contact: input.deliveryContact,
    default_city: input.defaultCity,
    default_sourcing: input.defaultSourcing,
  });

  res.json({ preferences });
}

const profileSchema = z.object({
  fullName: z.string().min(2).max(150).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(9).max(30).optional(),
  avatarUrl: mediaUrl.nullable().optional(),
});

export async function updateProfile(req: Request, res: Response) {

  if (req.user!.kind === 'staff') {
    const input = profileSchema.parse(req.body);
    const updated = await queryOne(
      `UPDATE staff SET
         full_name  = COALESCE($2, full_name),
         email      = COALESCE($3, email),
         phone      = COALESCE($4, phone),
         avatar_url = CASE WHEN $6::boolean THEN $5 ELSE avatar_url END,
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.user!.id, input.fullName, input.email, input.phone,
        input.avatarUrl ?? null, input.avatarUrl !== undefined,
      ]
    );
    if (!updated) throw new ApiError(404, 'Staff account not found');
    return res.json({ user: toPublicStaff(updated as never) });
  }

  const input = profileSchema.parse(req.body);
  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');

  const sets: string[] = [];
  const params: unknown[] = [user.id];
  let i = 2;

  if (input.fullName !== undefined) {
    sets.push(`full_name = $${i++}`);
    params.push(input.fullName.trim());
  }

  if (input.email !== undefined) {
    const email = input.email?.trim() ? normalizeEmail(input.email) : null;
    if (email) {
      const clash = await findUserByEmailAndRole(email, user.role);
      if (clash && clash.id !== user.id) {
        throw new ApiError(409, `Another ${user.role} account already uses this email`);
      }
    }
    sets.push(`email = $${i++}`);
    params.push(email);
  }

  if (input.phone !== undefined) {
    const phone = normalizePhone(input.phone);
    const clash = await findUserByPhoneAndRole(phone, user.role);
    if (clash && clash.id !== user.id) {
      throw new ApiError(409, `Another ${user.role} account already uses this phone number`);
    }
    sets.push(`phone = $${i++}`);
    params.push(phone);
  }

  if (input.avatarUrl !== undefined) {
    sets.push(`avatar_url = $${i++}`);
    params.push(input.avatarUrl);
  }

  if (sets.length === 0) return res.json({ user: toPublicUser(user) });

  sets.push('updated_at = now()');
  const updated = await queryOne(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  res.json({ user: toPublicUser(updated as any) });
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function changePassword(req: Request, res: Response) {
  if (req.user!.kind === 'staff') {
    const input = passwordSchema.parse(req.body);
    const me = await findStaffById(req.user!.id);
    if (!me) throw new ApiError(404, 'Staff account not found');
    if (!(await verifyPassword(input.currentPassword, me.password_hash))) {
      throw new ApiError(401, 'Your current password is not right');
    }
    if (await verifyPassword(input.newPassword, me.password_hash)) {
      throw new ApiError(400, 'The new password must be different from the current one');
    }
    await query(
      'UPDATE staff SET password_hash = $2, must_change_password = FALSE, updated_at = now() WHERE id = $1',
      [me.id, await hashPassword(input.newPassword)]
    );
    return res.json({ ok: true });
  }

  const input = passwordSchema.parse(req.body);
  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');

  const valid = await verifyPassword(input.currentPassword, user.password_hash);
  if (!valid) throw new ApiError(403, 'Your current password is not correct');

  if (input.currentPassword === input.newPassword) {
    throw new ApiError(400, 'The new password must be different from the current one');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
    user.id,
    passwordHash,
  ]);

  res.json({ ok: true });
}

export async function exportData(req: Request, res: Response) {
  const userId = req.user!.id;
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const [preferences, addresses, requests, orders, ratings, notifications] = await Promise.all([
    getOrCreatePreferences(userId),
    query('SELECT * FROM addresses WHERE user_id = $1', [userId]),
    query('SELECT * FROM shopping_requests WHERE customer_id = $1', [userId]),
    query('SELECT * FROM orders WHERE customer_id = $1 OR shopper_id = $1', [userId]),
    query('SELECT * FROM ratings WHERE rated_by = $1 OR rated_user = $1', [userId]),
    query('SELECT * FROM notifications WHERE user_id = $1', [userId]),
  ]);

  res.json({
    exportedAt: new Date().toISOString(),
    account: toPublicUser(user),
    preferences,
    addresses,
    requests,
    orders,
    ratings,
    notifications,
  });
}
