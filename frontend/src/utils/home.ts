import { UserRole } from '../types';

/**
 * Where a role lands after signing in.
 *
 * One place, because it was two ternaries in two files and adding super_admin
 * meant finding both — miss one and a super admin gets dropped on the customer
 * dashboard, which is both wrong and a hint to anyone watching that the account
 * is something other than a customer.
 */
export function homeFor(role: UserRole | undefined): string {
  if (role === 'shopper') return '/shopper';
  if (role === 'admin' || role === 'super_admin') return '/admin';
  return '/app';
}
