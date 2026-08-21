import { query, queryOne } from '../db/pool';

export interface NotificationRow {
  id: string;
  user_id: string;
  channel: 'in_app' | 'sms' | 'email' | 'push';
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export async function createNotification(input: {
  userId: string;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<NotificationRow | null> {
  return queryOne<NotificationRow>(
    `INSERT INTO notifications (user_id, channel, title, body, link)
     VALUES ($1, 'in_app', $2, $3, $4) RETURNING *`,
    [input.userId, input.title, input.body ?? null, input.link ?? null]
  );
}

export async function listNotifications(userId: string, limit = 30): Promise<NotificationRow[]> {
  return query<NotificationRow>(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
}

export async function countUnread(userId: string): Promise<number> {
  const row = await queryOne<{ n: string }>(
    'SELECT count(*) AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return Number(row?.n ?? 0);
}

/** Marks one notification read. Scoped by user_id so ids cannot be guessed. */
export async function markRead(userId: string, id: string): Promise<NotificationRow | null> {
  return queryOne<NotificationRow>(
    `UPDATE notifications SET read_at = now()
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING *`,
    [id, userId]
  );
}

export async function markAllRead(userId: string): Promise<number> {
  const rows = await query(
    'UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL RETURNING id',
    [userId]
  );
  return rows.length;
}
