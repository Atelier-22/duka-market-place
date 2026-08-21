/**
 * Where the signed-in session lives.
 *
 * It used to be localStorage, which is shared by every tab on the origin. So
 * signing in — or switching account — in one tab overwrote the token every
 * other tab was reading, and the next request or reload silently dragged them
 * all into the new account. Being an admin in one tab turned every open tab
 * into the admin console.
 *
 * The session now lives in sessionStorage, which is per-tab. Each tab keeps
 * whatever it signed in as, across reloads, regardless of what the others do.
 *
 * localStorage still holds a copy, used for exactly one thing: seeding a tab
 * that has no session of its own, so opening a new tab does not mean logging in
 * again. That seeding happens once, at load. After it, the tab is pinned to its
 * own session and never looks at the shared copy again — which is what stops
 * one tab from following another.
 */

const ACCESS = 'duka_access_token';
const REFRESH = 'duka_refresh_token';

/** Storage throws in some private-browsing modes; a dead session beats a crash. */
function safeGet(store: Storage, key: string): string | null {
  try { return store.getItem(key); } catch { return null; }
}
function safeSet(store: Storage, key: string, value: string) {
  try { store.setItem(key, value); } catch { /* nothing we can do, carry on */ }
}
function safeRemove(store: Storage, key: string) {
  try { store.removeItem(key); } catch { /* as above */ }
}

/**
 * Runs once per tab. A tab that already has a session keeps it; a fresh tab
 * borrows the last one used on this device so the person is not asked to sign
 * in again just for opening a tab.
 */
function adoptSharedSessionOnce() {
  if (typeof window === 'undefined') return;
  if (safeGet(sessionStorage, ACCESS)) return;

  const access = safeGet(localStorage, ACCESS);
  const refresh = safeGet(localStorage, REFRESH);
  if (access) {
    safeSet(sessionStorage, ACCESS, access);
    if (refresh) safeSet(sessionStorage, REFRESH, refresh);
  }
}
adoptSharedSessionOnce();

export function getAccessToken(): string | null {
  return safeGet(sessionStorage, ACCESS);
}

export function getRefreshToken(): string | null {
  return safeGet(sessionStorage, REFRESH);
}

/**
 * @param remember also update the shared copy, so the next new tab starts here.
 *   False when a tab changes account on its own — switching to admin in one tab
 *   must not decide what a tab opened later will be.
 */
export function setSession(accessToken: string, refreshToken?: string, remember = true) {
  safeSet(sessionStorage, ACCESS, accessToken);
  if (refreshToken) safeSet(sessionStorage, REFRESH, refreshToken);

  if (remember) {
    safeSet(localStorage, ACCESS, accessToken);
    if (refreshToken) safeSet(localStorage, REFRESH, refreshToken);
  }
}

/** Refreshed access token for this tab only — never touches the shared copy. */
export function setAccessToken(accessToken: string) {
  safeSet(sessionStorage, ACCESS, accessToken);
}

/**
 * Ends this tab's session, and clears the shared copy so a tab opened
 * afterwards does not resurrect what was just signed out of. Other tabs already
 * open keep their own sessions — they are separate sessions, and logging out of
 * one is not a statement about the others.
 */
export function clearSession() {
  safeRemove(sessionStorage, ACCESS);
  safeRemove(sessionStorage, REFRESH);
  safeRemove(localStorage, ACCESS);
  safeRemove(localStorage, REFRESH);
}
