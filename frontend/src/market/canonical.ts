import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export interface CanonicalSpec { key: string; label: string; value: string; unit: string | null; confidence: number; status: 'verified' | 'pending' | 'conflict'; sourceCount: number; bestTier: number | null }

export interface CanonicalLookup {
  known: boolean;
  product: { id: string; brand: string; model: string; displayName: string; category: string; listingCount: number; researchedAt: string | null; specs: CanonicalSpec[] } | null;
  research: { status: string; specsFound?: number; finishedAt?: string | null; error?: string | null } | null;
  researchConfigured: boolean;
}

export type CanonicalState = 'idle' | 'loading' | 'known' | 'unknown';

const requested = new Set<string>();

export function useCanonicalProduct(brand: string, model: string, category: string, kind: string, enabled = true) {
  const [lookup, setLookup] = useState<CanonicalLookup | null>(null);
  const [state, setState] = useState<CanonicalState>('idle');
  const ticket = useRef(0);
  const b = brand.trim();
  const m = model.trim();
  const key = `${b.toLowerCase()}|${m.toLowerCase()}`;

  useEffect(() => {
    if (!enabled || b.length < 2 || m.length < 2) { setLookup(null); setState('idle'); return; }
    const mine = ++ticket.current;
    setState('loading');
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async (): Promise<CanonicalLookup | null> => {
      try {
        const r = await api.get(`/knowledge/product?brand=${encodeURIComponent(b)}&model=${encodeURIComponent(m)}`);
        return r.data as CanonicalLookup;
      } catch { return null; }
    };

    const cycle = async () => {
      let data = await fetchOnce();
      if (mine !== ticket.current) return;
      if (data && !data.known && !requested.has(key)) {
        requested.add(key);
        try { await api.post('/knowledge/research', { brand: b, model: m, category, kind: kind || undefined }); } catch { /* research is optional */ }
        data = await fetchOnce();
        if (mine !== ticket.current) return;
      }
      setLookup(data);
      setState(data?.known ? 'known' : 'unknown');
      const status = data?.research?.status;
      if (data?.known && (status === 'queued' || status === 'running') && polls < 10) {
        polls += 1;
        timer = setTimeout(cycle, 6000);
      }
    };
    timer = setTimeout(cycle, 700);
    return () => { if (timer) clearTimeout(timer); };
  }, [key, category, kind, enabled]);

  return { lookup, state };
}
