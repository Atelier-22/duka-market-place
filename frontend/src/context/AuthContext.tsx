import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, apiErrorMessage } from '../services/api';
import { clearSession, getAccessToken, setSession } from '../services/session';
import { LinkedAccount, User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;

  linkedAccounts: LinkedAccount[];
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: { role: UserRole; fullName: string; phone: string; email?: string; password: string }) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  switchAccount: (userId: string) => Promise<UserRole>;

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

  function adoptSession(
    data: { user: User; accessToken: string; refreshToken: string; linkedAccounts?: LinkedAccount[] },
    remember = true
  ) {
    setSession(data.accessToken, data.refreshToken, remember);
    setUser(data.user);
    setLinkedAccounts(data.linkedAccounts ?? []);
  }

  async function login(identifier: string, password: string) {
    try {
      const res = await api.post('/auth/login', { identifier, password });
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
