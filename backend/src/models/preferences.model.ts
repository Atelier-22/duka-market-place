import { queryOne } from '../db/pool';

export interface PreferencesRow {
  user_id: string;
  theme: 'system' | 'light' | 'dark';
  accent: string;
  language: string;
  tone: string;
  traits: string[];
  notify_messages: boolean;
  notify_orders: boolean;
  notify_offers: boolean;
  notify_marketing: boolean;

  notify_new_requests: boolean;

  share_location: boolean;
  location_prompt_dismissed_at: string | null;

  notify_security: boolean;
  delivery_instructions: string | null;
  delivery_handoff: 'meet' | 'gate' | 'call';
  delivery_contact: 'call' | 'message' | 'either';
  default_city: string | null;
  default_sourcing: string | null;
}

export async function getOrCreatePreferences(userId: string): Promise<PreferencesRow> {
  const existing = await queryOne<PreferencesRow>(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  if (existing) return existing;

  const created = await queryOne<PreferencesRow>(
    `INSERT INTO user_preferences (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [userId]
  );
  if (!created) throw new Error('Failed to create preferences');
  return created;
}

const UPDATABLE = [
  'theme', 'accent', 'language', 'tone', 'traits',
  'notify_messages', 'notify_orders', 'notify_offers', 'notify_marketing', 'notify_new_requests',
  'share_location', 'location_prompt_dismissed_at',
  'notify_security', 'delivery_instructions', 'delivery_handoff', 'delivery_contact',
  'default_city', 'default_sourcing',
] as const;

export type PreferencePatch = Partial<Record<(typeof UPDATABLE)[number], unknown>>;

export async function updatePreferences(userId: string, patch: PreferencePatch): Promise<PreferencesRow> {
  await getOrCreatePreferences(userId);

  const sets: string[] = [];
  const params: unknown[] = [userId];
  let i = 2;

  for (const key of UPDATABLE) {
    if (patch[key] === undefined) continue;
    sets.push(`${key} = $${i++}`);
    params.push(patch[key]);
  }

  if (sets.length === 0) return getOrCreatePreferences(userId);

  sets.push('updated_at = now()');
  const row = await queryOne<PreferencesRow>(
    `UPDATE user_preferences SET ${sets.join(', ')} WHERE user_id = $1 RETURNING *`,
    params
  );
  if (!row) throw new Error('Failed to update preferences');
  return row;
}
