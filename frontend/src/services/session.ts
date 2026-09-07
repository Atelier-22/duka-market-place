const ACCESS = 'duka_access_token';
const REFRESH = 'duka_refresh_token';

function safeGet(store: Storage, key: string): string | null {
  try { return store.getItem(key); } catch { return null; }
}
function safeSet(store: Storage, key: string, value: string) {
  try { store.setItem(key, value); } catch {  }
}
function safeRemove(store: Storage, key: string) {
  try { store.removeItem(key); } catch {  }
}

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

export function setSession(accessToken: string, refreshToken?: string, remember = true) {
  safeSet(sessionStorage, ACCESS, accessToken);
  if (refreshToken) safeSet(sessionStorage, REFRESH, refreshToken);

  if (remember) {
    safeSet(localStorage, ACCESS, accessToken);
    if (refreshToken) safeSet(localStorage, REFRESH, refreshToken);
  }
}

export function setAccessToken(accessToken: string) {
  safeSet(sessionStorage, ACCESS, accessToken);
}

export function clearSession() {
  safeRemove(sessionStorage, ACCESS);
  safeRemove(sessionStorage, REFRESH);
  safeRemove(localStorage, ACCESS);
  safeRemove(localStorage, REFRESH);
}
