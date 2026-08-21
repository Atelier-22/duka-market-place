import { query } from '../db/pool';

/**
 * Who is at their phone right now.
 *
 * There is no socket connection to hang presence off, so we infer it: every
 * authenticated request stamps `users.last_seen_at`, and anyone stamped inside
 * ONLINE_WINDOW_MS counts as online. The frontend polls its threads every few
 * seconds, so an open chat keeps its own presence fresh without any dedicated
 * heartbeat call.
 *
 * The window has to be comfortably longer than the client's poll interval or
 * people would flicker offline between polls.
 */
export const ONLINE_WINDOW_MS = 90_000;

/** SQL fragment for "is this user online", given an alias for the users row. */
export function onlineExpr(alias: string): string {
  return `(${alias}.last_seen_at IS NOT NULL AND ${alias}.last_seen_at > now() - interval '${ONLINE_WINDOW_MS} milliseconds')`;
}

/**
 * Writing on every single request would put a row update in front of every
 * read in the app. One write per user per interval is enough resolution for a
 * 90-second window, so the rest are dropped here.
 */
const TOUCH_INTERVAL_MS = 25_000;
const lastTouched = new Map<string, number>();

/**
 * The map only ever grows if we let it. Sweep on write, not on a timer, so
 * nothing keeps the process alive.
 */
function sweep(now: number) {
  if (lastTouched.size < 5_000) return;
  for (const [id, at] of lastTouched) {
    if (now - at > TOUCH_INTERVAL_MS * 4) lastTouched.delete(id);
  }
}

/**
 * Fire-and-forget: presence is never worth failing a request over, so errors
 * are swallowed rather than propagated to the caller.
 */
export function touchPresence(userId: string): void {
  const now = Date.now();
  const previous = lastTouched.get(userId);
  if (previous && now - previous < TOUCH_INTERVAL_MS) return;
  lastTouched.set(userId, now);
  sweep(now);

  query('UPDATE users SET last_seen_at = now() WHERE id = $1', [userId]).catch(() => {
    // Let the next request try again rather than pinning a stale timestamp.
    lastTouched.delete(userId);
  });
}
