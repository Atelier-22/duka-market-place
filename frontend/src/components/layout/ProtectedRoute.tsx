import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { SkeletonAppShell } from '../ui/Skeleton';
import { homeFor } from '../../utils/home';

export function ProtectedRoute({ allow }: { allow: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SkeletonAppShell />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    const home = homeFor(user.role);
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}
