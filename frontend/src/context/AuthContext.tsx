import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, apiErrorMessage } from '../services/api';
import { clearSession, getAccessToken, setSession } from '../services/session';
import { LinkedAccount, User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  /** Other-role accounts this session may switch into without re-authenticating. */
  linkedAccounts: LinkedAccount[];
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: { role: UserRole; fullName: string; phone: string; email?: string; password: string }) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  switchAccount: (userId: string) => Promise<UserRole>;
  /** Re-read /auth/me, after something changes the stored user — an avatar, say. */
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setLinkedAccounts(res.data.linkedAccounts ?? []);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  /**
   * @param remember whether this becomes the session a newly opened tab starts
   *   from. True for signing in; false when this tab changes account on its own
   *   — switching to the admin here must not decide what a later tab becomes,
   *   which is the whole reason every tab used to follow the last one.
   */
  function adoptSession(
    data: { user: User; accessToken: string; refreshToken: string; linkedAccounts?: LinkedAccount[] },
    remember = true
  ) {
    setSession(data.accessToken, data.refreshToken, remember);
    setUser(data.user);
    setLinkedAccounts(data.linkedAccounts ?? []);
  }

  async function login(phone: string, password: string) {
    try {
      const res = await api.post('/auth/login', { phone, password });
      adoptSession(res.data);
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  async function register(input: { role: UserRole; fullName: string; phone: string; email?: string; password: string }) {
    try {
      const res = await api.post('/auth/register', input);
      adoptSession(res.data);
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  async function switchRole(role: UserRole) {
    try {
      const res = await api.post('/auth/switch-role', { role });
      adoptSession({ ...res.data, linkedAccounts }, false);
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  /** Swap to a linked account; returns its role so the caller can redirect. */
  async function switchAccount(userId: string): Promise<UserRole> {
    try {
      const res = await api.post('/auth/switch-account', { userId });
      adoptSession(res.data, false);
      return res.data.user.role as UserRole;
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  function logout() {
    clearSession();
    setUser(null);
    setLinkedAccounts([]);
  }

  return (
    <AuthContext.Provider
      value={{ user, linkedAccounts, isLoading, login, register, switchRole, switchAccount, refresh: loadMe, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
