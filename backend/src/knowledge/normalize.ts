export type AttributeType = 'text' | 'number' | 'currency' | 'boolean' | 'select' | 'multi_select' | 'measurement' | 'colour' | 'date' | 'year' | 'range';

export function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export function normalizeValue(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ').replace(/["“”]/g, '"').slice(0, 120);
}

export function cleanValue(input: string, max = 80): string {
  return input.trim().replace(/\s+/g, ' ').slice(0, max);
}

const UNITS: Record<string, string> = {
  gb: 'GB', tb: 'TB', mb: 'MB', kg: 'kg', g: 'g', mg: 'mg', l: 'L', ml: 'ml', km: 'km', m: 'm', cm: 'cm', mm: 'mm',
  w: 'W', kw: 'kW', kva: 'kVA', mah: 'mAh', v: 'V', ah: 'Ah', hp: 'HP', cc: 'cc', mp: 'MP', hz: 'Hz', '"': '"', in: '"', inch: '"', inches: '"',
  yards: 'yards', yard: 'yards', pcs: 'pieces', pieces: 'pieces', piece: 'pieces', seater: 'seater', sqm: 'sqm', acres: 'acres', acre: 'acres', oz: 'oz', lb: 'lb',
};

export interface ParsedMeasure { numeric: number; unit: string | null }

export function parseMeasure(value: string): ParsedMeasure | null {
  const m = value.trim().replace(/,/g, '').match(/^(-?\d+(?:\.\d+)?)\s*([a-zA-Z"]+)?$/);
  if (!m) return null;
  const numeric = Number(m[1]);
  if (!Number.isFinite(numeric)) return null;
  const rawUnit = (m[2] ?? '').toLowerCase();
  return { numeric, unit: rawUnit ? UNITS[rawUnit] ?? m[2] ?? null : null };
}

export function looksLikeYear(value: string): boolean {
  const n = Number(value.trim());
  return Number.isInteger(n) && n >= 1950 && n <= 2035;
}

export function looksLikeBoolean(value: string): boolean {
  return /^(yes|no|true|false)$/i.test(value.trim());
}

export function inferAttributeType(label: string, sampleValue: string): { type: AttributeType; unit: string | null } {
  const l = label.toLowerCase();
  if (/colou?r|paint|shade/.test(l) && !/temperature/.test(l)) return { type: 'colour', unit: null };
  if (/^year|year of|model year/.test(l)) return { type: 'year', unit: null };
  if (/price|cost|ugx|fee/.test(l)) return { type: 'currency', unit: 'UGX' };
  if (/date|expiry|expires/.test(l)) return { type: 'date', unit: null };
  if (looksLikeBoolean(sampleValue)) return { type: 'boolean', unit: null };
  if (looksLikeYear(sampleValue) && /year/.test(l)) return { type: 'year', unit: null };
  const measure = parseMeasure(sampleValue);
  if (measure && measure.unit) return { type: 'measurement', unit: measure.unit };
  if (measure && !measure.unit) return { type: 'number', unit: null };
  if (sampleValue.trim().length > 60 || sampleValue.trim().split(/\s+/).length > 8) return { type: 'text', unit: null };
  return { type: 'select', unit: null };
}

export function isHex(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function titleCase(input: string): string {
  return input.trim().replace(/\s+/g, ' ').replace(/(^|\s)([a-z])/g, (m) => m.toUpperCase());
}
