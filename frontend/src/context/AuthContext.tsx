import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, apiErrorMessage } from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: { role: UserRole; fullName: string; phone: string; email?: string; password: string }) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  async function login(phone: string, password: string) {
    try {
      const res = await api.post('/auth/login', { phone, password });
      localStorage.setItem('duka_access_token', res.data.accessToken);
      localStorage.setItem('duka_refresh_token', res.data.refreshToken);
      setUser(res.data.user);
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  async function register(input: { role: UserRole; fullName: string; phone: string; email?: string; password: string }) {
    try {
      const res = await api.post('/auth/register', input);
      localStorage.setItem('duka_access_token', res.data.accessToken);
      localStorage.setItem('duka_refresh_token', res.data.refreshToken);
      setUser(res.data.user);
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  async function switchRole(role: UserRole) {
    try {
      const res = await api.post('/auth/switch-role', { role });
      localStorage.setItem('duka_access_token', res.data.accessToken);
      localStorage.setItem('duka_refresh_token', res.data.refreshToken);
      setUser(res.data.user);
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  function logout() {
    localStorage.removeItem('duka_access_token');
    localStorage.removeItem('duka_refresh_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
