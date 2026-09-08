import { Request, Response } from 'express';
import { z } from 'zod';
import { STORE_CATEGORIES } from '../seller/categories';
import { categoryOverview, filtersFor, resolveForm } from './knowledge.model';
import { interpretQuery } from './interpret';

const formSchema = z.object({
  category: z.enum(STORE_CATEGORIES),
  kind: z.string().trim().max(80).optional().default(''),
  brand: z.string().trim().max(80).optional().default(''),
});

export async function categories(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ categories: await categoryOverview() });
}

export async function form(req: Request, res: Response) {
  const { category, kind, brand } = formSchema.parse(req.query);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json(await resolveForm(category, kind, brand));
}

export async function filters(req: Request, res: Response) {
  const { category, kind } = z.object({ category: z.enum(STORE_CATEGORIES).optional(), kind: z.string().trim().max(80).optional() }).parse(req.query);
  res.setHeader('Cache-Control', 'public, max-age=120');
  res.json({ filters: await filtersFor(category ?? null, kind ?? null) });
}

export async function interpret(req: Request, res: Response) {
  const { q } = z.object({ q: z.string().trim().min(1).max(120) }).parse(req.query);
  res.json({ interpretation: await interpretQuery(q) });
}
