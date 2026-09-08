import { query } from '../db/pool';
import { normalizeValue } from './normalize';

interface Lexicon {
  loadedAt: number;
  brands: Map<string, { name: string; slug: string }>;
  kinds: Map<string, { id: string; name: string; category: string; variantKey: string | null }>;
  colours: Map<string, string>;
  options: Map<string, { key: string; value: string }[]>;
  byAttribute: Map<string, Map<string, string>>;
  kindTerms: Map<string, string[]>;
}

let cache: Lexicon | null = null;
const TTL = 60_000;

async function lexicon(): Promise<Lexicon> {
  if (cache && Date.now() - cache.loadedAt < TTL) return cache;
  const [brands, brandSyn, kinds, kindSyn, colours, options] = await Promise.all([
    query<{ name: string; slug: string }>(`SELECT name, slug FROM product_brands WHERE status = 'active' AND merged_into IS NULL`),
    query<{ term_norm: string; name: string; slug: string }>(`SELECT s.term_norm, b.name, b.slug FROM product_synonyms s JOIN product_brands b ON b.id = s.entity_id WHERE s.entity_type = 'brand' AND s.status = 'active' AND b.status = 'active'`),
    query<{ id: string; name: string; category: string; variant_key: string | null }>(
      `SELECT k.id, k.name, k.category,
              (SELECT a.key FROM product_kind_attributes ka JOIN product_attributes a ON a.id = ka.attribute_id WHERE ka.kind_id = k.id AND ka.role = 'variant' AND a.type <> 'colour' AND ka.status = 'active' ORDER BY ka.position LIMIT 1) AS variant_key
         FROM product_kinds k WHERE k.status = 'active' AND NOT k.is_default AND k.merged_into IS NULL`
    ),
    query<{ term_norm: string; id: string; name: string; category: string }>(`SELECT s.term_norm, k.id, k.name, k.category FROM product_synonyms s JOIN product_kinds k ON k.id = s.entity_id WHERE s.entity_type = 'kind' AND s.status = 'active' AND k.status = 'active'`),
    query<{ value_norm: string; value: string }>(`SELECT DISTINCT ON (o.value_norm) o.value_norm, o.value FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id WHERE a.key = 'colour' AND o.status = 'active' ORDER BY o.value_norm, o.observation_count DESC`),
    query<{ value_norm: string; value: string; key: string }>(
      `SELECT DISTINCT o.value_norm, o.value, a.key FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id
        WHERE o.status = 'active' AND a.status = 'active' AND a.type IN ('select', 'year') AND a.key NOT IN ('colour', 'model', 'brand', 'make') AND length(o.value_norm) BETWEEN 1 AND 20`
    ),
  ]);
  const lex: Lexicon = { loadedAt: Date.now(), brands: new Map(), kinds: new Map(), colours: new Map(), options: new Map(), byAttribute: new Map(), kindTerms: new Map() };
  for (const b of brands) lex.brands.set(normalizeValue(b.name), { name: b.name, slug: b.slug });
  for (const b of brandSyn) if (!lex.brands.has(b.term_norm)) lex.brands.set(b.term_norm, { name: b.name, slug: b.slug });
  const variantByKind = new Map(kinds.map((k) => [k.id, k.variant_key]));
  for (const k of kinds) {
    const norm = normalizeValue(k.name);
    if (!lex.kinds.has(norm)) lex.kinds.set(norm, { id: k.id, name: k.name, category: k.category, variantKey: k.variant_key });
    if (norm.endsWith('s') && !lex.kinds.has(norm.slice(0, -1))) lex.kinds.set(norm.slice(0, -1), { id: k.id, name: k.name, category: k.category, variantKey: k.variant_key });
  }
  for (const k of kindSyn) if (!lex.kinds.has(k.term_norm)) lex.kinds.set(k.term_norm, { id: k.id, name: k.name, category: k.category, variantKey: variantByKind.get(k.id) ?? null });
  for (const k of kinds) lex.kindTerms.set(k.id, [k.name]);
  for (const k of kindSyn) lex.kindTerms.set(k.id, [...(lex.kindTerms.get(k.id) ?? [k.name]), k.term_norm]);
  for (const c of colours) lex.colours.set(c.value_norm, c.value);
  for (const o of options) {
    const byAttr = lex.byAttribute.get(o.key) ?? new Map<string, string>();
    byAttr.set(o.value_norm, o.value);
    lex.byAttribute.set(o.key, byAttr);
    if (/^\d{1,3}$/.test(o.value_norm) || o.value_norm.length < 2) continue;
    const list = lex.options.get(o.value_norm) ?? [];
    if (!list.some((x) => x.key === o.key)) list.push({ key: o.key, value: o.value });
    lex.options.set(o.value_norm, list);
  }
  cache = lex;
  return lex;
}

export function invalidateLexicon() { cache = null; }

export interface Interpretation {
  category: string | null;
  kind: string | null;
  kindId: string | null;
  kindTerms: string[];
  brand: string | null;
  colour: string | null;
  attributes: Record<string, string[]>;
  text: string;
  matched: { type: string; phrase: string; as: string }[];
}

const STOP = new Set(['a', 'an', 'the', 'for', 'with', 'and', 'in', 'of', 'size', 'colour', 'color', 'cheap', 'new', 'used', 'best', 'buy']);

export async function interpretQuery(q: string): Promise<Interpretation> {
  const lex = await lexicon();
  const tokens = normalizeValue(q).replace(/[^\w\s"'.\-/]/g, ' ').split(/\s+/).filter(Boolean);
  const used = new Array<boolean>(tokens.length).fill(false);
  const out: Interpretation = { category: null, kind: null, kindId: null, kindTerms: [], brand: null, colour: null, attributes: {}, text: '', matched: [] };

  const claim = (start: number, len: number) => { for (let i = start; i < start + len; i++) used[i] = true; };
  const tryPhrases = (fn: (phrase: string, start: number, len: number) => boolean) => {
    for (let len = 3; len >= 1; len--) {
      for (let i = 0; i + len <= tokens.length; i++) {
        if (used.slice(i, i + len).some(Boolean)) continue;
        if (fn(tokens.slice(i, i + len).join(' '), i, len)) claim(i, len);
      }
    }
  };

  tryPhrases((phrase, _i, _len) => {
    if (out.kind) return false;
    const kind = lex.kinds.get(phrase);
    if (!kind) return false;
    out.kind = kind.name; out.kindId = kind.id; out.category = kind.category;
    out.kindTerms = lex.kindTerms.get(kind.id) ?? [kind.name];
    out.matched.push({ type: 'kind', phrase, as: kind.name });
    return true;
  });
  tryPhrases((phrase) => {
    if (out.brand) return false;
    const brand = lex.brands.get(phrase);
    if (!brand) return false;
    out.brand = brand.name;
    out.matched.push({ type: 'brand', phrase, as: brand.name });
    return true;
  });
  tryPhrases((phrase) => {
    if (out.colour) return false;
    const colour = lex.colours.get(phrase);
    if (!colour) return false;
    out.colour = colour;
    out.attributes.colour = [colour];
    out.matched.push({ type: 'colour', phrase, as: colour });
    return true;
  });

  const variantKey = out.kindId ? [...lex.kinds.values()].find((k) => k.id === out.kindId)?.variantKey ?? null : null;
  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;
    const t = tokens[i];
    const storage = t.match(/^(\d{2,4})(gb|tb)$/);
    if (storage) {
      const next = tokens[i + 1];
      const key = next === 'ram' ? 'ram' : 'storage';
      (out.attributes[key] ??= []).push(`${storage[1]}${storage[2].toUpperCase()}`);
      out.matched.push({ type: key, phrase: t, as: `${storage[1]}${storage[2].toUpperCase()}` });
      used[i] = true; if (next === 'ram') used[i + 1] = true;
      continue;
    }
    if (variantKey) {
      const prev = tokens[i - 1];
      const known = lex.byAttribute.get(variantKey)?.get(t);
      const numeric = /^\d{1,3}$/.test(t);
      if ((numeric && (prev === 'size' || prev === 'waist' || prev === variantKey || out.kind)) || (known && (prev === 'size' || prev === variantKey || t.length >= 2))) {
        const value = known ?? t;
        if (!(out.attributes[variantKey] ?? []).includes(value)) (out.attributes[variantKey] ??= []).push(value);
        out.matched.push({ type: variantKey, phrase: t, as: value });
        used[i] = true;
        if (prev === 'size' || prev === 'waist' || prev === variantKey) used[i - 1] = true;
        continue;
      }
    }
    if (/^(19|20)\d{2}$/.test(t) && (out.category === 'cars' || out.category === 'motorcycles')) {
      (out.attributes.year ??= []).push(t);
      out.matched.push({ type: 'year', phrase: t, as: t });
      used[i] = true;
      continue;
    }
    const option = lex.options.get(t);
    if (option && option.length === 1 && !out.attributes[option[0].key]) {
      (out.attributes[option[0].key] ??= []).push(option[0].value);
      out.matched.push({ type: option[0].key, phrase: t, as: option[0].value });
      used[i] = true;
    }
  }
  out.text = tokens.filter((t, i) => !used[i] && !STOP.has(t)).join(' ');
  return out;
}
