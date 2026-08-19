import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { LoadingState } from '../ui/LoadingState';

export function ProtectedRoute({ allow }: { allow: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState label="Loading your account…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    const home = user.role === 'shopper' ? '/shopper' : user.role === 'admin' ? '/admin' : '/app';
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}
