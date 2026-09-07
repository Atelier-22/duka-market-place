import { BRAND } from '../../config/brand';
import { Clause, LegalDoc, Pending, PROSE_LINK } from '../../components/layout/LegalDoc';
import { usePageMeta } from '../../hooks/usePageMeta';

const UPDATED = '7 September 2026';

export function PrivacyPolicyPage() {
  usePageMeta({ title: 'Privacy Policy', description: 'What Duka collects, why, how long it is kept, and who can see it.' });
  return (
    <LegalDoc
      title="Privacy Policy"
      updated={UPDATED}
      intro={`This explains what ${BRAND.name} collects, why, how long it is kept, and who sees it. It describes what the service actually does today — not what it might do later.`}
    >
      <Pending>
        {BRAND.name} is not yet incorporated as a company. This policy is published by{' '}
        {BRAND.operatorName}, operating {BRAND.name} as an individual trader in {BRAND.country}. When
        the business is registered, the legal entity name and registered address must be added here
        and in the footer.
      </Pending>

      <Clause heading="Who is responsible">
        <p>
          {BRAND.operatorName}, operating {BRAND.name}, decides what personal data is collected and
          why. That makes him the data controller under Uganda&rsquo;s Data Protection and Privacy
          Act 2019.
        </p>
        <p>
          Email{' '}
          <a className={PROSE_LINK} href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
          {BRAND.supportPhone ? `, or call ${BRAND.supportPhone}` : ''}.
        </p>
        <Pending>
          The Act requires data collectors and processors to register with the Personal Data
          Protection Office at NITA-U, and processing national ID documents is the kind of activity
          that attracts that duty. Registration status and whether a Data Protection Officer must be
          appointed have not yet been confirmed with a qualified adviser. This must be resolved
          before identity verification is switched on for the public.
        </Pending>
      </Clause>

      <Clause heading="What we collect, and why">
        <p>
          <strong>Your account.</strong> Your name, phone number, and a password we never store in
          readable form. An email address, only if you give one — it is optional, and the service
          works without it. We need these to create your account and to tell a shopper who they are
          delivering to.
        </p>
        <p>
          <strong>Delivery addresses.</strong> The address text, an optional landmark, and map
          coordinates if you pin them. A shopper cannot deliver to a place they cannot find.
        </p>
        <p>
          <strong>What you ask for.</strong> The items you request, any reference photos, your
          budget, and the shop or market you name. This is the order itself.
        </p>
        <p>
          <strong>Messages.</strong> The text, photos and voice notes exchanged between you and your
          shopper, and whether a message has been delivered and read. Photos of goods and receipts
          are how a disagreement about an order gets settled.
        </p>
        <p>
          <strong>Location while an order is live.</strong> If you allow it, your device shares its
          position with the other party during an active delivery, so a customer can see the shopper
          approaching and a shopper can find the door. Sharing is a switch you control and it applies
          only to a live order.
        </p>
        <p>
          <strong>Identity documents, for shoppers.</strong> Covered in its own section below.
        </p>
        <p>
          <strong>Technical.</strong> The time of your last activity, so chat can show whether the
          other person is online, and ordinary server logs.
        </p>
        <p>
          We do not collect anything for advertising, and we do not build profiles of you for any
          purpose other than running an order.
        </p>
      </Clause>

      <Clause heading="Identity documents, and what happens to them">
        <p>
          A shopper must verify their identity before working. That means photographing a government
          identity document. This is the most sensitive thing we handle, so it is handled differently
          from everything else:
        </p>
        <p>
          <strong>The photograph is deleted as soon as a decision is made.</strong> Approved or
          rejected, the image is destroyed at the moment the decision is recorded. It is never kept
          &ldquo;in case&rdquo;.
        </p>
        <p>
          <strong>What is kept is not the document.</strong> After the decision we retain a one-way
          keyed hash of the ID number, a masked form of it such as CM&bull;&bull;&bull;&bull;9012,
          the date of birth and expiry checks that were made, and the decision with its reason and
          reviewer. The hash cannot be turned back into the number; it exists so that one document
          cannot quietly verify several accounts, and so that a document used fraudulently cannot be
          reused after an account is deleted.
        </p>
        <p>
          <strong>While it exists, only two kinds of person can open it:</strong> you, and a
          {' '}{BRAND.name} reviewer. The image is never given a public link — unlike a chat photo, it
          cannot be opened by anyone holding a URL, and it is never cached by your browser.
        </p>
        <p>
          <strong>No automated decision approves anyone.</strong> Automated checks can reject a
          submission — an expired document, an unreadable photo, a number already verified elsewhere
          — and will tell you why. Approval is always a person&rsquo;s decision.
        </p>
      </Clause>

      <Clause heading="Who else sees your information">
        <p>
          <strong>Your shopper, or your customer.</strong> Once an order is matched, each side sees
          the other&rsquo;s name, phone number, and the messages between them. The customer&rsquo;s
          delivery address is shown to the shopper handling that order. This is unavoidable: someone
          has to know where to bring the shopping.
        </p>
        <p>
          <strong>{BRAND.name} staff.</strong> Support and administrative staff can see orders and,
          where a dispute is raised, the evidence attached to it. Staff actions on accounts and
          payments are recorded in an internal audit log.
        </p>
        <p>
          <strong>Our hosting providers.</strong> The site is served by Vercel and the service runs
          on Render, with the database hosted by Neon. They store the data on our behalf and do not
          use it for their own purposes.
        </p>
        <p>
          <strong>Two services your browser contacts directly.</strong> Fonts are loaded from Google
          Fonts, and map tiles from OpenStreetMap. Both receive your IP address when a page or a map
          loads, because that is how the internet fetches a file. Neither is given your name, your
          account, or what you ordered.
        </p>
        <p>
          We do not sell personal data, and we do not share it for advertising. There is no
          advertising on {BRAND.name}.
        </p>
      </Clause>

      <Clause heading="How long we keep things">
        <p>
          <strong>Identity document photographs:</strong> deleted when the decision is made.
        </p>
        <p>
          <strong>Identity check results</strong> — the hashed number, the checks and the decision:
          kept for as long as the service operates, because their whole purpose is to prevent a
          document being reused after an account is gone.
        </p>
        <p>
          <strong>Orders, messages and their attachments:</strong> kept while your account is open,
          because they are the record of what was agreed and are the evidence in any dispute.
        </p>
        <p>
          <strong>Your account:</strong> kept until you ask us to close it.
        </p>
        <Pending>
          Fixed retention periods for closed accounts and completed orders have not been set. They
          should be decided rather than left open-ended.
        </Pending>
      </Clause>

      <Clause heading="Your rights">
        <p>
          Under the Data Protection and Privacy Act 2019 you may ask to see the personal data we
          hold about you, ask us to correct it, ask us to delete it, object to how it is used, and
          complain to the Personal Data Protection Office.
        </p>
        <p>
          Email{' '}
          <a className={PROSE_LINK} href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>{' '}
          and we will respond. Two honest limits: we may need to confirm who you are before handing
          over account data, and deleting an account does not erase the hashed identity record, for
          the fraud-prevention reason given above. That record cannot identify you on its own.
        </p>
      </Clause>

      <Clause heading="Children">
        <p>
          {BRAND.name} is not for anyone under 18. Identity checks reject a date of birth under 18,
          and we do not knowingly keep accounts for children.
        </p>
      </Clause>

      <Clause heading="Where your data is held">
        <p>
          Our hosting providers operate outside {BRAND.country}, so your data is stored on servers
          abroad. The Act places conditions on transferring personal data out of Uganda.
        </p>
        <Pending>
          Whether the current hosting arrangement satisfies those conditions has not been reviewed.
          This needs checking before launch.
        </Pending>
      </Clause>

      <Clause heading="If we serve people outside Uganda">
        <p>
          {BRAND.name} is operated for people in {BRAND.country}. If we begin accepting users in the
          European Union, the United Kingdom or California, additional laws apply and this policy
          will be updated before that happens.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          If this policy changes in a way that affects you, we will say so in the app rather than
          quietly changing the date at the top.
        </p>
      </Clause>
    </LegalDoc>
  );
}
