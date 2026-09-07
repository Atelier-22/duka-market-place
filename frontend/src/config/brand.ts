/**
 * Central brand config. This is the ONLY file you should need to touch to
 * rename the product — every page imports the name from here rather than
 * hardcoding it.
 */
export const BRAND = {
  name: 'Duka',
  tagline: 'If you want it, we can find it.',
  /**
   * A real, monitored mailbox. The privacy policy names it as the contact
   * point for data requests, so an address that bounces is worse than none.
   *
   * Currently the operator's own inbox, which works today. Better long term is
   * support@dukashoppers.com forwarded here: same delivery, but a personal
   * address stops being scraped off a public page.
   */
  supportEmail: 'opolotedwindereal@gmail.com',
  /**
   * The previous value was +256 700 000 000, which is not a number — it was on
   * the live footer, so anyone who needed help was given something to ring
   * that could never answer.
   */
  supportPhone: '+256 752 337 267',
  /**
   * Duka is not incorporated. Until it is, the operator is a named individual
   * trader, and the policy pages have to say whose service this is.
   */
  operatorName: 'Opolot Edwin',
  country: 'Uganda',
  currency: 'UGX',
};
