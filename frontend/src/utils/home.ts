import { UserRole } from '../types';

export function homeFor(role: UserRole | undefined): string {
  if (role === 'shopper') return '/shopper';
  if (role === 'seller') return '/seller';
  if (role === 'admin' || role === 'super_admin') return '/admin';
  return '/app';
}
