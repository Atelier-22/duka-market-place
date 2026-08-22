/**
 * Whether this role may look at, and act on, an order it is not part of.
 *
 * Defined once because it was spreading as `role === 'admin'` across six
 * controllers, and adding super_admin would have meant finding all six and
 * getting every one of them right. A missed check here is not a cosmetic bug:
 * it is either an admin locked out of a dispute or a stranger let into an
 * order.
 */
export function hasOversight(role: string | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}
