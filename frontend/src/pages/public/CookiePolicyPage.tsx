import { BRAND } from '../../config/brand';
import { Clause, LegalDoc } from '../../components/layout/LegalDoc';

export function CookiePolicyPage() {
  return (
    <LegalDoc
      title="Cookies & Storage"
      updated="7 September 2026"
      intro={`Short version: ${BRAND.name} sets no cookies at all, and there is no tracking of any kind. This page explains what it does store on your device instead, and why there is no consent banner.`}
    >
      <Clause heading="We do not use cookies">
        <p>
          Not for sign-in, not for analytics, not for advertising. The service sets no cookies
          whatsoever — you can check this in your browser&rsquo;s developer tools.
        </p>
      </Clause>

      <Clause heading="What we store instead">
        <p>
          Signing in gives your browser a token, held in your tab&rsquo;s own session storage. It is
          what keeps you signed in as you move between pages, and it is cleared when you close the
          tab. It is kept per tab on purpose, so signing into two accounts in two tabs does not drag
          one into the other.
        </p>
        <p>
          A few small preferences are kept in local storage so the app looks the same next time: your
          theme and accent colour, your language, whether the sidebar is collapsed, and which style
          of phone navigation you chose. None of it is sent anywhere, and none of it identifies you.
        </p>
        <p>
          Uploaded photos and messages are stored on our servers, not on your device.
        </p>
      </Clause>

      <Clause heading="Why there is no consent banner">
        <p>
          Consent is required for storage that is not strictly necessary — tracking, profiling,
          advertising. Everything above is either required to keep you signed in or a preference you
          set yourself, so a banner would be asking permission for something the law does not require
          permission for, and adding one would train you to dismiss a real question later.
        </p>
        <p>
          If {BRAND.name} ever adds analytics, this page will change and a consent request will
          appear before any such script is loaded — not after it has already run.
        </p>
      </Clause>

      <Clause heading="Two things your browser fetches from elsewhere">
        <p>
          Page fonts come from Google Fonts, and map tiles come from OpenStreetMap. Both receive your
          IP address when your browser requests a file from them, which is how any web request works.
          Neither sets a cookie through {BRAND.name}, and neither is told who you are or what you
          ordered.
        </p>
        <p>
          When a shopper taps &ldquo;directions&rdquo; on a delivery, that opens Google Maps in a new
          tab. From that point they are on Google&rsquo;s site, under Google&rsquo;s terms.
        </p>
      </Clause>

      <Clause heading="Clearing what is stored">
        <p>
          Signing out discards the session token. Clearing site data in your browser removes the
          preferences as well. Neither deletes your account or your orders — for that, see the{' '}
          <a className="font-medium text-brand-green-fresh underline" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </Clause>
    </LegalDoc>
  );
}
