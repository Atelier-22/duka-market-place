import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';

const FAQS = [
  { category: 'Shopping', q: 'What can I ask a shopper to buy?', a: 'Almost anything sold in a physical market, shop, supermarket, or by a seller you found on social media — as long as it\u2019s legal to buy and deliver.' },
  { category: 'Shopping', q: 'What if I don\u2019t know exactly where to buy something?', a: 'Choose "Let shopper find it" when creating your request. Your shopper can search local shops and submit a few priced options for you to choose from.' },
  { category: 'Payments', q: 'How is the price broken down?', a: 'Every order shows the item price, shopping fee, delivery fee, and platform fee as separate line items — never a single bundled number.' },
  { category: 'Payments', q: 'How do I pay?', a: 'The MVP supports cash on delivery and manually confirmed payments. Mobile money and card payments are coming as we integrate licensed payment providers.' },
  { category: 'Delivery', q: 'How long does delivery take?', a: 'It depends on the item and distance, but most requests are completed within a few hours. Your shopper gives you an estimate when they accept.' },
  { category: 'Refunds', q: 'What if the item isn\u2019t what I asked for?', a: 'Don\u2019t confirm delivery — raise a dispute instead. Our support team reviews the evidence (photos, receipts, messages) and resolves it fairly.' },
  { category: 'Shopper verification', q: 'How are shoppers verified?', a: 'Shoppers submit identification documents for review before they can accept jobs. Verified shoppers are marked on their profile.' },
  { category: 'Safety', q: 'Is my payment protected?', a: 'You approve the exact price and see photo evidence before any purchase is made, and you only confirm delivery once you\u2019ve received the item.' },
  { category: 'Disputes', q: 'What happens if there\u2019s a disagreement?', a: 'Either side can raise a dispute on an order. Our admin team reviews the order history, evidence, and messages to resolve it.' },
];

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const categories = Array.from(new Set(FAQS.map((f) => f.category)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-medium text-brand-green-deep">Help &amp; FAQ</h1>
      <p className="mt-3 text-brand-ink/60">Answers to the questions we hear most often.</p>

      {categories.map((cat) => (
        <div key={cat} className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-green-deep/50">{cat}</h2>
          <div className="flex flex-col gap-3">
            {FAQS.filter((f) => f.category === cat).map((faq) => {
              const idx = FAQS.indexOf(faq);
              const isOpen = openIndex === idx;
              return (
                <GlassCard key={faq.q} hover={false} padding="md" className="cursor-pointer" onClick={() => setOpenIndex(isOpen ? null : idx)}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-brand-ink">{faq.q}</p>
                    <span className="text-brand-green-fresh">{isOpen ? '−' : '+'}</span>
                  </div>
                  {isOpen && <p className="mt-2 text-sm text-brand-ink/60">{faq.a}</p>}
                </GlassCard>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
