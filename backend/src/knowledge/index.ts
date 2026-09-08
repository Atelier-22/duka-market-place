import { queryOne } from '../db/pool';
import { onProductEvent } from '../seller/events';
import { observeProduct } from './learn';
import { invalidateLexicon } from './interpret';
import { seedKnowledgeIfEmpty } from './seed';

let queue: Promise<void> = Promise.resolve();

async function learnIfPublished(productId: string) {
  const row = await queryOne<{ status: string }>(`SELECT status FROM seller_products WHERE id = $1`, [productId]);
  if (!row || row.status !== 'published') return;
  await observeProduct(productId);
  invalidateLexicon();
}

function enqueue(productId: string) {
  queue = queue.then(() => learnIfPublished(productId)).catch((err) => console.error('[knowledge] learning failed', err));
  return queue;
}

export function registerKnowledge() {
  onProductEvent('product.published', ({ productId }) => enqueue(productId));
  onProductEvent('product.updated', ({ productId }) => enqueue(productId));
  seedKnowledgeIfEmpty().catch((err) => console.error('[knowledge] seed failed', err));
}
