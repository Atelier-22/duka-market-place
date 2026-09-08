import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export interface Swatch { name: string; hex: string | null }

export interface FormAttribute { key: string; name: string; type: string; unit: string | null; role: 'required' | 'optional'; options: string[]; groups?: { label: string; values: string[] }[]; groupKey?: string }

export interface FormTraits { colours: boolean; brand: boolean; model: boolean }

export interface FormKnowledge {
  category: string;
  kinds: { id: string; name: string; versionType: string | null; status: string }[];
  kind: { id: string; name: string; isDefault: boolean } | null;
  versionType: string;
  versionKey: string | null;
  versions: string[];
  attributes: FormAttribute[];
  brands: string[];
  colours: Swatch[];
  colourTitle: string;
  palette: Swatch[];
  traits: FormTraits;
}

export interface FilterFacet { key: string; name: string; type: string; unit: string | null; values: { value: string; count: number; hex: string | null }[] }

export interface Interpretation {
  category: string | null;
  kind: string | null;
  kindTerms: string[];
  brand: string | null;
  colour: string | null;
  attributes: Record<string, string[]>;
  text: string;
  matched: { type: string; phrase: string; as: string }[];
}

export const FALLBACK_PALETTE: Swatch[] = [
  { name: 'Black', hex: '#111111' }, { name: 'White', hex: '#F5F5F5' }, { name: 'Navy blue', hex: '#1F3A93' },
  { name: 'Blue', hex: '#2563EB' }, { name: 'Sky blue', hex: '#7DD3FC' }, { name: 'Green', hex: '#16A34A' },
  { name: 'Red', hex: '#DC2626' }, { name: 'Orange', hex: '#F97316' }, { name: 'Yellow', hex: '#FACC15' },
  { name: 'Pink', hex: '#EC4899' }, { name: 'Purple', hex: '#7C3AED' }, { name: 'Grey', hex: '#9CA3AF' },
  { name: 'Brown', hex: '#8B5E3C' }, { name: 'Gold', hex: '#D4AF37' }, { name: 'Silver', hex: '#C0C0C0' },
];

export function emptyKnowledge(category: string): FormKnowledge {
  return { category, kinds: [], kind: null, versionType: 'Option', versionKey: null, versions: [], attributes: [], brands: [], colours: [], colourTitle: '', palette: FALLBACK_PALETTE, traits: { colours: true, brand: true, model: true } };
}

const cache = new Map<string, FormKnowledge>();

export async function fetchKnowledge(category: string, kind: string, brand: string): Promise<FormKnowledge> {
  const key = `${category}|${kind.trim().toLowerCase()}|${brand.trim().toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const params = new URLSearchParams({ category });
  if (kind.trim()) params.set('kind', kind.trim());
  if (brand.trim()) params.set('brand', brand.trim());
  const res = await api.get(`/knowledge/form?${params.toString()}`);
  const data = res.data as FormKnowledge;
  if (data.palette.length === 0) data.palette = FALLBACK_PALETTE;
  if (!data.traits) data.traits = { colours: true, brand: true, model: true };
  cache.set(key, data);
  return data;
}

export function invalidateKnowledge() { cache.clear(); }

export function useProductKnowledge(category: string, kind: string, brand: string): { knowledge: FormKnowledge; loading: boolean } {
  const [knowledge, setKnowledge] = useState<FormKnowledge>(() => emptyKnowledge(category));
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchKnowledge(category, kind, brand)
        .then((data) => { if (ticket === latest.current) setKnowledge(data); })
        .catch(() => { if (ticket === latest.current) setKnowledge((k) => (k.category === category ? k : emptyKnowledge(category))); })
        .finally(() => { if (ticket === latest.current) setLoading(false); });
    }, brand.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [category, kind, brand]);
  return { knowledge, loading };
}

export async function fetchFilters(category: string | null, kind: string | null): Promise<FilterFacet[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (kind) params.set('kind', kind);
  const res = await api.get(`/knowledge/filters?${params.toString()}`);
  return res.data.filters as FilterFacet[];
}
