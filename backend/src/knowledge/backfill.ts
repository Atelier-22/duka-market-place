import { pool, query } from '../db/pool';
import { observeProduct } from './learn';
import { seedKnowledge } from './seed';
import { seedCanonicalCatalogue } from './lifecycle';

async function main() {
  const counts = await seedKnowledge();
  console.log(`knowledge base: ${counts.kinds} kinds, ${counts.attributes} attributes, ${counts.options} options, ${counts.brands} brands`);
  const catalogue = await seedCanonicalCatalogue();
  console.log(`catalogue: ${catalogue} new canonical products`);
  const products = await query<{ id: string; name: string }>(`SELECT id, name FROM seller_products WHERE status = 'published' ORDER BY published_at`);
  let observations = 0;
  for (const p of products) {
    const result = await observeProduct(p.id);
    observations += result?.observations ?? 0;
    console.log(`  ${p.name}: ${result?.observations ?? 0} observations${result?.kind ? ` (${result.kind})` : ''}`);
  }
  console.log(`${products.length} published products processed, ${observations} observations recorded`);
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
