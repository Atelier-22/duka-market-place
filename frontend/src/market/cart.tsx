import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CartLine {
  key: string;
  productId: string;
  variationId: string | null;
  name: string;
  variationLabel: string | null;
  unitPriceUgx: number;
  imageUrl: string | null;
  storeId: string;
  storeName: string;
  storeSlug: string;
  deliveryFeeUgx: number;
  fulfilment: 'delivery' | 'pickup' | 'shopper';
  storeLocation: string | null;
  maxQuantity: number;
  quantity: number;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  add: (line: Omit<CartLine, 'key' | 'quantity'>, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  byStore: { storeId: string; storeName: string; storeSlug: string; deliveryFeeUgx: number; fulfilment: 'delivery' | 'pickup' | 'shopper'; storeLocation: string | null; lines: CartLine[]; subtotal: number }[];
  subtotal: number;
  total: number;
}

const KEY = 'duka_cart';
const CartContext = createContext<CartValue | null>(null);

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((l) => l && l.productId && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
  }, [lines]);

  const add = useCallback((line: Omit<CartLine, 'key' | 'quantity'>, quantity = 1) => {
    const key = `${line.productId}|${line.variationId ?? ''}`;
    setLines((current) => {
      const existing = current.find((l) => l.key === key);
      if (existing) {
        return current.map((l) => (l.key === key ? { ...l, ...line, quantity: Math.min(l.maxQuantity, l.quantity + quantity) } : l));
      }
      return [...current, { ...line, key, quantity: Math.min(line.maxQuantity, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) => current
      .map((l) => (l.key === key ? { ...l, quantity: Math.max(0, Math.min(l.maxQuantity, quantity)) } : l))
      .filter((l) => l.quantity > 0));
  }, []);

  const remove = useCallback((key: string) => setLines((current) => current.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const groups = new Map<string, CartValue['byStore'][number]>();
    for (const l of lines) {
      const g = groups.get(l.storeId) ?? { storeId: l.storeId, storeName: l.storeName, storeSlug: l.storeSlug, deliveryFeeUgx: l.deliveryFeeUgx, fulfilment: l.fulfilment ?? 'delivery', storeLocation: l.storeLocation ?? null, lines: [], subtotal: 0 };
      g.lines.push(l);
      g.subtotal += l.unitPriceUgx * l.quantity;
      groups.set(l.storeId, g);
    }
    const byStore = [...groups.values()];
    const subtotal = byStore.reduce((s, g) => s + g.subtotal, 0);
    const total = subtotal + byStore.reduce((s, g) => s + (g.fulfilment === 'delivery' ? g.deliveryFeeUgx : 0), 0);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      byStore,
      subtotal,
      total,
    };
  }, [lines, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
