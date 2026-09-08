const CATEGORY_LABELS: Record<string, string> = {
  electronics: 'Electronics',
  phones: 'Phones & tablets',
  fashion: 'Fashion',
  shoes: 'Shoes',
  beauty: 'Beauty',
  home: 'Home',
  kitchen: 'Kitchen',
  groceries: 'Groceries',
  baby: 'Baby & kids',
  sports: 'Sports',
  books: 'Books',
  automotive: 'Automotive',
  health: 'Health',
  crafts: 'Crafts',
  general: 'General',
};

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatUgx(n: number | string | null | undefined): string {
  return `${new Intl.NumberFormat('en-UG').format(Math.round(Number(n ?? 0)))} UGX`;
}

export function compactUgx(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M UGX`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K UGX`;
  return `${v} UGX`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
}

export function conditionLabel(c: string): string {
  return c === 'new' ? 'Brand new' : c === 'used' ? 'Used' : 'Refurbished';
}

export const FULFILMENT_LABEL: Record<string, string> = {
  delivery: 'Delivers to you',
  pickup: 'Collect from the store',
  shopper: 'No delivery. Send a Duka shopper',
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Waiting for the store',
  confirmed: 'Confirmed',
  preparing: 'Being prepared',
  ready: 'Ready for delivery',
  completed: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};
