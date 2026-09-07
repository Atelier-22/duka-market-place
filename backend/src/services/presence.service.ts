import { query } from '../db/pool';

export const ONLINE_WINDOW_MS = 90_000;

export function onlineExpr(alias: string): string {
  return `(${alias}.last_seen_at IS NOT NULL AND ${alias}.last_seen_at > now() - interval '${ONLINE_WINDOW_MS} milliseconds')`;
}

const TOUCH_INTERVAL_MS = 25_000;
const lastTouched = new Map<string, number>();

function sweep(now: number) {
  if (lastTouched.size < 5_000) return;
  for (const [id, at] of lastTouched) {
    if (now - at > TOUCH_INTERVAL_MS * 4) lastTouched.delete(id);
  }
}

export function touchPresence(userId: string): void {
  const now = Date.now();
  const previous = lastTouched.get(userId);
  if (previous && now - previous < TOUCH_INTERVAL_MS) return;
  lastTouched.set(userId, now);
  sweep(now);

  query('UPDATE users SET last_seen_at = now() WHERE id = $1', [userId]).catch(() => {

    lastTouched.delete(userId);
  });
}
