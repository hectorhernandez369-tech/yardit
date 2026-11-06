import { isPreSpreeEligible, isPreSpreeOfferOpen } from "./preSpree.js";

export const FEATURED_PRICE_CENTS = 499;

export function getFeaturedPricing(listing, { enabled = true, now = new Date() } = {}) {
  const showPromotion = enabled && listing?.listingType === "yard_sale" &&
    isPreSpreeOfferOpen(now, listing?.timeZoneId);
  const isFree = showPromotion && isPreSpreeEligible(listing, now);
  const hasDates = Boolean(listing?.selectedRangeStartDate && listing?.selectedRangeEndDate);
  const scheduleMessage = isFree
    ? "Pre-Spree applied: Featured is FREE for these dates. Publish without payment."
    : showPromotion && hasDates
      ? "These dates aren’t included in Pre-Spree. Featured costs $4.99."
      : showPromotion
        ? "Featured costs $4.99. Select November 21 and/or 22, 2026 to get it FREE."
        : "Featured costs $4.99 for your selected dates.";
  return { showPromotion, isFree, hasDates, amountCents: isFree ? 0 : FEATURED_PRICE_CENTS, scheduleMessage };
}
