import { BRAND } from '../../config/brand';
import { Clause, LegalDoc, Pending } from '../../components/layout/LegalDoc';

export function RefundPolicyPage() {
  return (
    <LegalDoc
      title="Refund Policy"
      updated="7 September 2026"
      intro={`When you get your money back, when you do not, and — because ${BRAND.name} never holds your money — who actually returns it.`}
    >
      <Clause heading="Read this part first">
        <p>
          <strong>{BRAND.name} never receives your payment.</strong> You pay your shopper directly,
          in cash on delivery or as the two of you arrange. Nothing passes through us, because
          holding customer money is a regulated activity in {BRAND.country} and we are not licensed
          for it.
        </p>
        <p>
          So we cannot process a refund the way an online shop can. What we do instead is rule on
          what should happen, and hold both sides to it. In practice that means: for cash on
          delivery, the strongest protection is refusing the goods at the door, before money changes
          hands. Do not confirm delivery for an order you are not happy with.
        </p>
      </Clause>

      <Clause heading="The two separate amounts">
        <p>
          Every order has two parts, and they are treated differently.
        </p>
        <p>
          <strong>The cost of the goods</strong> is what the shop charged. If the goods are wrong or
          never arrive, this is what you should not be paying, and the receipt is the evidence of
          what it was.
        </p>
        <p>
          <strong>The service and delivery fees</strong> are what {BRAND.name} and your shopper
          charge for the errand. If the errand was performed properly, these are earned even if you
          have changed your mind about the item. If the errand failed — nothing delivered, or the
          wrong thing brought — they are not.
        </p>
      </Clause>

      <Clause heading="When you are entitled to your money back">
        <p><strong>Nothing was delivered.</strong> Goods, delivery fee and service fee all void.</p>
        <p>
          <strong>The wrong item was brought,</strong> and it is not what you described. Goods and
          delivery fee void. Refuse it at the door where you can.
        </p>
        <p>
          <strong>The item arrived damaged</strong> through how it was handled or carried. Goods and
          delivery fee void. Photograph it in the chat before you accept it.
        </p>
        <p>
          <strong>You were overcharged</strong> against the receipt — the difference is yours back,
          and the receipt settles it.
        </p>
        <p>
          <strong>Fraud.</strong> A shopper who takes payment and disappears, or bills for goods
          never bought. Everything void, and the account is suspended.
        </p>
      </Clause>

      <Clause heading="When you are not">
        <p>
          <strong>You changed your mind</strong> about something correctly bought and delivered. The
          shopper did the work and spent their own money; that is not theirs to carry.
        </p>
        <p>
          <strong>It was delivered as described</strong> but you do not like the colour, size, brand
          or quality — where you did not specify it. Say precisely what you want when you order.
        </p>
        <p>
          <strong>You were not there</strong> at the address you gave, or unreachable on the number
          you gave. The delivery fee is earned.
        </p>
        <p>
          <strong>Perishables</strong> — fresh food, meat, produce — once accepted and taken away,
          unless they were already spoiled when handed over.
        </p>
        <p>
          <strong>The shop&rsquo;s own return policy</strong> is the shop&rsquo;s. We can tell you
          what it is; we cannot override it.
        </p>
      </Clause>

      <Clause heading="How to raise it">
        <p>
          <strong>Do not confirm delivery.</strong> Confirming is you saying the order was fulfilled,
          and it is much harder to unpick afterwards.
        </p>
        <p>
          Raise a dispute on the order in the app. Attach photographs and the receipt — the chat
          history for that order is automatically part of the evidence. Raise it within{' '}
          <strong>48 hours</strong> of delivery, or immediately for a non-delivery.
        </p>
        <p>
          A member of staff reviews both sides and records an outcome. We aim to do this within three
          working days.
        </p>
      </Clause>

      <Clause heading="What happens after a decision">
        <p>
          <strong>If you have not yet paid,</strong> which is the usual case with cash on delivery,
          you simply do not pay the part that was voided. This is why refusing at the door matters.
        </p>
        <p>
          <strong>If you have already paid,</strong> the shopper is required to return the amount
          directly to you, by the same route you paid, within{' '}
          <strong>7 days</strong> of the decision. {BRAND.name} records the outcome against the
          order and against the shopper&rsquo;s account.
        </p>
        <p>
          <strong>If a shopper does not comply,</strong> their account is suspended and they are
          removed from the platform. We will say so plainly: this is the limit of what an
          introduction service can enforce, and it is the reason we recommend paying on delivery
          rather than in advance.
        </p>
        <p>
          <strong>{BRAND.name}&rsquo;s own service fee</strong> is waived on any order decided in the
          customer&rsquo;s favour.
        </p>
      </Clause>

      <Pending>
        Two things here need a business decision rather than a policy sentence. First, whether{' '}
        {BRAND.name} will cover a customer&rsquo;s loss when a shopper refuses to pay back — a
        goodwill guarantee is the usual answer, but it costs money and needs a funded limit. Second,
        the 48-hour claim window and 7-day return window are proposals, not something a lawyer has
        checked against {BRAND.country} consumer law. Both should be settled before launch.
      </Pending>

      <Clause heading="Cancelling before delivery">
        <p>
          Cancel before a shopper accepts and nothing is owed. Cancel after they have accepted but
          before they have bought, and nothing is owed for the goods, though the delivery fee may
          stand if they have already travelled. Once the goods are bought, they cannot be unbought —
          you owe the cost, and cancelling becomes a return question for the shop.
        </p>
      </Clause>
    </LegalDoc>
  );
}
