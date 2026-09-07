import { BRAND } from '../../config/brand';
import { Clause, LegalDoc, Pending } from '../../components/layout/LegalDoc';

export function TermsPage() {
  return (
    <LegalDoc
      title="Terms & Conditions"
      updated="7 September 2026"
      intro={`These are the rules for using ${BRAND.name}. Using the service means accepting them. They are written to be read, not to be impenetrable.`}
    >
      <Pending>
        {BRAND.name} is not yet incorporated. These terms are published by {BRAND.operatorName},
        operating {BRAND.name} as an individual trader in {BRAND.country}, and have not been
        reviewed by a lawyer. The liability, contractor-status and dispute clauses below are the
        ones most likely to need professional review before launch.
      </Pending>

      <Clause heading="What Duka is">
        <p>
          {BRAND.name} introduces someone who wants something bought to someone willing to go and buy
          it. We are the introduction and the record of what was agreed. We are not the shop, we do
          not own the goods, and we never take possession of them.
        </p>
        <p>
          The purchase itself is between you and the shop or seller. The errand is between you and
          your shopper.
        </p>
      </Clause>

      <Clause heading="The two roles">
        <p>
          <strong>Customers</strong> describe what they need, name a budget, and accept or decline an
          offer. You are responsible for describing the item accurately and for being reachable at
          the address you gave.
        </p>
        <p>
          <strong>Shoppers</strong> buy the items and deliver them. You are responsible for buying
          what was actually asked for, keeping the receipt, and handing over the goods in the
          condition you bought them.
        </p>
        <p>
          A shopper must complete identity verification before working. Verification can be withdrawn
          if the document turns out to be false or is used on more than one account.
        </p>
        <Pending>
          Whether shoppers are independent contractors or workers is a legal question with tax and
          employment consequences, and it is not settled here. It must be decided before shoppers are
          recruited at any scale.
        </Pending>
      </Clause>

      <Clause heading="Money">
        <p>
          <strong>{BRAND.name} does not hold your money.</strong> Payment is cash on delivery, or
          arranged directly between you and your shopper, and it never passes through us. This is
          deliberate: holding customer funds is a regulated activity in {BRAND.country} and we are
          not licensed for it.
        </p>
        <p>
          {BRAND.name} charges a service fee on an order, shown before you confirm. Delivery fees are
          shown separately. What the goods cost is what the shop charged, and the receipt is your
          evidence of that.
        </p>
        <p>
          Because we never receive your money, we cannot return it. What we can do when something
          goes wrong is set out in the{' '}
          <a className="font-medium text-brand-green-fresh underline" href="/refunds">Refund Policy</a>.
        </p>
      </Clause>

      <Clause heading="What we are and are not responsible for">
        <p>
          We are responsible for running the service honestly: matching you fairly, keeping the
          record of what was agreed, holding your data as described in the{' '}
          <a className="font-medium text-brand-green-fresh underline" href="/privacy">Privacy Policy</a>,
          and reviewing a dispute properly when one is raised.
        </p>
        <p>
          We are not responsible for the quality, safety, legality or fitness of goods bought through
          the service, for a shop&rsquo;s prices, or for a shopper&rsquo;s conduct away from the app.
          A delivery may be late for reasons neither we nor your shopper control — traffic, weather,
          a shop being shut. Where a delay, a wrong item or damage is the shopper&rsquo;s doing, that
          is a matter between you and them, and we will mediate.
        </p>
        <p>
          Nothing here removes rights you have under the consumer law of {BRAND.country} that cannot
          be signed away.
        </p>
      </Clause>

      <Clause heading="Disputes">
        <p>
          If an order goes wrong, do not confirm delivery. Raise a dispute in the app instead, and
          the messages, photos and receipts attached to that order become the evidence.
        </p>
        <p>
          A member of {BRAND.name} staff reviews both sides and records an outcome: in the
          customer&rsquo;s favour, in the shopper&rsquo;s favour, or split. We aim to review within a
          few working days. Our decision settles the matter within the app; it does not stop either
          of you pursuing the matter elsewhere.
        </p>
        <p>These terms are governed by the laws of {BRAND.country}.</p>
      </Clause>

      <Clause heading="What you must not do">
        <p>
          Do not use {BRAND.name} to buy or move anything illegal, stolen, or that you may not
          lawfully possess: drugs, weapons, counterfeit goods, wildlife products, or anything
          requiring a licence you do not hold.
        </p>
        <p>
          Do not impersonate anyone, submit an identity document that is not yours, hold more than
          one shopper account, invent orders or reviews, harass the person on the other side of an
          order, take the transaction off the platform to avoid fees, or attempt to break, overload
          or probe the service.
        </p>
      </Clause>

      <Clause heading="Suspension and closing accounts">
        <p>
          We may suspend or close an account that breaks these terms, that we reasonably believe is
          being used fraudulently, or that puts another user at risk. Where we can, we will say why
          and give you a chance to answer. Where the risk is immediate — a false identity document,
          an apparent scam — we may act first.
        </p>
        <p>
          You can close your account at any time by emailing{' '}
          <a className="font-medium text-brand-green-fresh underline" href={`mailto:${BRAND.supportEmail}`}>
            {BRAND.supportEmail}
          </a>
          . Orders still in progress must be finished or cancelled first. As explained in the Privacy
          Policy, the hashed record of a verified identity document is kept after closure so it
          cannot be reused to open another account.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          If these terms change in a way that affects you, we will tell you in the app before the
          change applies.
        </p>
      </Clause>
    </LegalDoc>
  );
}
