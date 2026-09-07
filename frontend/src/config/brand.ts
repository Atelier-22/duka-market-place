/**
 * Central brand config. This is the ONLY file you should need to touch to
 * rename the product — every page imports the name from here rather than
 * hardcoding it.
 */
export const BRAND = {
  name: 'Duka',
  tagline: 'If you want it, we can find it.',
  /**
   * Must be a mailbox that is actually read: the privacy policy names it as
   * the contact point for data requests, and an address that bounces is worse
   * than no address at all. Set up forwarding for it on the domain before
   * launch.
   */
  supportEmail: 'support@dukashoppers.com',
  /**
   * No public phone number yet. The previous one here was +256 700 000 000,
   * which is not a real number — it was shown in the footer of the live site,
   * so anyone who needed help was given something to ring that could never
   * answer. Better to show nothing than that. Put a real number here and the
   * footer picks it up.
   */
  supportPhone: '',
  country: 'Uganda',
  currency: 'UGX',
};
