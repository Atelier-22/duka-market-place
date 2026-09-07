import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { BRAND } from '../../config/brand';

export const FAQS = [
  { category: 'Shopping', q: 'What can I ask a shopper to buy?', a: 'Almost anything sold in a physical market, shop, supermarket, or by a seller you found on social media — as long as it’s legal to buy and deliver.' },
  { category: 'Shopping', q: 'What if I don’t know exactly where to buy something?', a: 'Choose "Let shopper find it" when creating your request. Your shopper can search local shops and submit a few priced options for you to choose from.' },
  { category: 'Payments', q: 'How is the price broken down?', a: 'Every order shows the item price, shopping fee, delivery fee, and platform fee as separate line items — never a single bundled number.' },
  { category: 'Payments', q: 'How do I pay?', a: 'The MVP supports cash on delivery and manually confirmed payments. Mobile money and card payments are coming as we integrate licensed payment providers.' },
  { category: 'Delivery', q: 'How long does delivery take?', a: 'It depends on the item and distance, but most requests are completed within a few hours. Your shopper gives you an estimate when they accept.' },
  { category: 'Refunds', q: 'What if the item isn’t what I asked for?', a: 'Don’t confirm delivery — raise a dispute instead. Our support team reviews the evidence (photos, receipts, messages) and resolves it fairly.' },
  { category: 'Shopper verification', q: 'How are shoppers verified?', a: 'Shoppers submit identification documents for review before they can accept jobs. Verified shoppers are marked on their profile.' },
  { category: 'Safety', q: 'Is my payment protected?', a: 'You approve the exact price and see photo evidence before any purchase is made, and you only confirm delivery once you’ve received the item.' },
  { category: 'Disputes', q: 'What happens if there’s a disagreement?', a: 'Either side can raise a dispute on an order. Our admin team reviews the order history, evidence, and messages to resolve it.' },
];

const PROSE_LINK = 'font-medium text-brand-green hover:underline';

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const categories = Array.from(new Set(FAQS.map((f) => f.category)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-label font-semibold uppercase text-ink-3">Help</p>
        <h1 className="mt-2 font-display text-display font-medium text-brand-green-deep">Help &amp; FAQ</h1>
        <p className="mt-4 text-body text-ink-2">
          Answers to the questions we hear most often. If yours is not here, email us and a person
          will reply.
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-10">
        {categories.map((cat) => {
          const headingId = `faq-${slug(cat)}`;
          return (
            <section key={cat} aria-labelledby={headingId}>
              <h2 id={headingId} className="mb-3 text-label font-semibold uppercase text-ink-3">{cat}</h2>
              <Card padding="none" className="overflow-hidden">
                {FAQS.filter((f) => f.category === cat).map((faq) => {
                  const idx = FAQS.indexOf(faq);
                  const isOpen = openIndex === idx;
                  const panelId = `faq-panel-${idx}`;
                  return (
                    <div key={faq.q} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                        className="flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 ease-standard hover:bg-surface-2 focus-visible:outline-offset-[-3px]"
                      >
                        <span className="text-body font-medium text-ink">{faq.q}</span>
                        {isOpen ? (
                          <Minus size={18} strokeWidth={2} className="shrink-0 text-brand-green" aria-hidden="true" />
                        ) : (
                          <Plus size={18} strokeWidth={2} className="shrink-0 text-brand-green" aria-hidden="true" />
                        )}
                      </button>
                      {isOpen && (
                        <div id={panelId} className="px-5 pb-5 text-body text-ink-2">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>

      <footer className="mt-12 border-t border-line pt-6">
        <p className="text-small text-ink-2">
          Still stuck? Email{' '}
          <a className={PROSE_LINK} href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
          {BRAND.supportPhone ? ` or call ${BRAND.supportPhone}` : ''}.
        </p>
      </footer>
    </div>
  );
}
