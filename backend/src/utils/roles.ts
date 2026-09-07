export function hasOversight(role: string | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}
