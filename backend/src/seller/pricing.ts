export interface PromotionLike {
  kind: 'percentage' | 'fixed';
  value: number;
  starts_at: string | Date;
  ends_at: string | Date | null;
  is_active: boolean;
}

export function promotionIsLive(p: PromotionLike, now = new Date()): boolean {
  if (!p.is_active) return false;
  const starts = new Date(p.starts_at);
  if (starts > now) return false;
  if (p.ends_at && new Date(p.ends_at) < now) return false;
  return true;
}

export function applyPromotion(base: number, p: PromotionLike): number {
  const value = Number(p.value);
  const cut = p.kind === 'percentage' ? Math.round(base * (value / 100)) : value;
  return Math.max(1, base - cut);
}

export function effectivePrice(
  product: { price_ugx: number | string; sale_price_ugx: number | string | null },
  promotions: PromotionLike[] = []
): { price: number; listPrice: number; discountPercent: number; promotionName: string | null } {
  const listPrice = Number(product.price_ugx);
  let price = product.sale_price_ugx ? Number(product.sale_price_ugx) : listPrice;
  let promotionName: string | null = null;

  for (const p of promotions) {
    if (!promotionIsLive(p)) continue;
    const candidate = applyPromotion(product.sale_price_ugx ? Number(product.sale_price_ugx) : listPrice, p);
    if (candidate < price) {
      price = candidate;
      promotionName = (p as { name?: string }).name ?? null;
    }
  }

  const discountPercent = listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
  return { price, listPrice, discountPercent, promotionName };
}
