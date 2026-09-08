import { queryOne } from '../db/pool';
import { onProductEvent } from '../seller/events';
import { observeProduct } from './learn';
import { invalidateLexicon } from './interpret';
import { seedKnowledgeIfEmpty } from './seed';
import { applySellerSpecs, findOrCreateCanonical, linkListing, refreshListingCount } from './canonical';
import { enqueueResearch, runResearch } from './research';
import { findKind } from './knowledge.model';

let queue: Promise<void> = Promise.resolve();

function enqueue(label: string, task: () => Promise<void>) {
  queue = queue.then(task).catch((err) => console.error(`[knowledge] ${label} failed`, err));
  return queue;
}

async function learnIfPublished(productId: string) {
  const row = await queryOne<{ status: string }>(`SELECT status FROM seller_products WHERE id = $1`, [productId]);
  if (!row || row.status !== 'published') return;
  await observeProduct(productId);
  invalidateLexicon();
  await applySellerSpecs(productId);
}

async function linkToCanonical(productId: string, requestedBy: string) {
  const listing = await queryOne<{ brand: string | null; model: string | null; category: string; subcategory: string | null; canonical_product_id: string | null }>(
    `SELECT brand, model, category, subcategory, canonical_product_id FROM seller_products WHERE id = $1`,
    [productId]
  );
  if (!listing) return;
  if (!listing.brand?.trim() || !listing.model?.trim()) {
    if (listing.canonical_product_id) { await linkListing(productId, null); await refreshListingCount(listing.canonical_product_id); }
    return;
  }
  const kind = await findKind(listing.category, listing.subcategory);
  const canonical = await findOrCreateCanonical({ brand: listing.brand, model: listing.model, category: listing.category, kindId: kind?.id ?? null, createdBy: 'seller' });
  if (!canonical) return;
  await linkListing(productId, canonical.id);
  const job = await enqueueResearch(canonical, requestedBy);
  if (job.status === 'queued') scheduleResearch(job.id);
}

export function scheduleResearch(jobId: string) {
  enqueue('research', () => runResearch(jobId));
}

export function registerKnowledge() {
  onProductEvent('product.created', ({ productId, ownerId }) => enqueue('link', () => linkToCanonical(productId, ownerId)));
  onProductEvent('product.updated', ({ productId, ownerId }) => enqueue('link', () => linkToCanonical(productId, ownerId)).then(() => enqueue('learn', () => learnIfPublished(productId))));
  onProductEvent('product.published', ({ productId, ownerId }) => enqueue('link', () => linkToCanonical(productId, ownerId)).then(() => enqueue('learn', () => learnIfPublished(productId))));
  onProductEvent('product.unpublished', ({ productId }) => enqueue('unlink-count', async () => {
    const row = await queryOne<{ canonical_product_id: string | null }>(`SELECT canonical_product_id FROM seller_products WHERE id = $1`, [productId]);
    if (row?.canonical_product_id) await refreshListingCount(row.canonical_product_id);
  }));
  seedKnowledgeIfEmpty().catch((err) => console.error('[knowledge] seed failed', err));
}
