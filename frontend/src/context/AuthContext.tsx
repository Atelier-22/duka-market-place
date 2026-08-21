import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, apiErrorMessage } from '../services/api';
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
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('duka_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setLinkedAccounts(res.data.linkedAccounts ?? []);
    } catch {
      localStorage.removeItem('duka_access_token');
      localStorage.removeItem('duka_refresh_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  function adoptSession(data: { user: User; accessToken: string; refreshToken: string; linkedAccounts?: LinkedAccount[] }) {
    localStorage.setItem('duka_access_token', data.accessToken);
    localStorage.setItem('duka_refresh_token', data.refreshToken);
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
      adoptSession({ ...res.data, linkedAccounts });
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  /** Swap to a linked account; returns its role so the caller can redirect. */
  async function switchAccount(userId: string): Promise<UserRole> {
    try {
      const res = await api.post('/auth/switch-account', { userId });
      adoptSession(res.data);
      return res.data.user.role as UserRole;
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  function logout() {
    localStorage.removeItem('duka_access_token');
    localStorage.removeItem('duka_refresh_token');
    setUser(null);
    setLinkedAccounts([]);
  }

  return (
    <AuthContext.Provider
      value={{ user, linkedAccounts, isLoading, login, register, switchRole, switchAccount, logout }}
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
