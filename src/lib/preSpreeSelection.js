import { PRE_SPREE_CAMPAIGN, PRE_SPREE_START, PRE_SPREE_END, isPreSpreeEligible, preSpreeLocalParts } from "./preSpree.js";

export function isPreSpreeSelected(data) {
  return data?.listingType === "yard_sale" && data?.tier === "featured" && data?.listing_offer === PRE_SPREE_CAMPAIGN;
}

export function selectPreSpreeOffer(data, now = new Date()) {
  const today = preSpreeLocalParts(now, data?.timeZoneId).date;
  const start = today > PRE_SPREE_START && today <= PRE_SPREE_END ? today : PRE_SPREE_START;
  return {
    ...data, tier: "featured", listing_offer: PRE_SPREE_CAMPAIGN,
    selectedRangeStartDate: start, selectedRangeEndDate: PRE_SPREE_END,
    earlyVisibilityDays: 0, earlyVisibilityDates: [], early_visibility_enabled: false,
    early_visibility_days: 0, visibility_start_date: "", early_visibility_promo_code: "",
    discovery_promo_code: "", discovery_promo_title: "", discovery_promo_starts_at: "", discovery_promo_expires_at: "",
    photoUrls: (data?.photoUrls || []).slice(0, 10),
  };
}

export function selectStandardTier(data, tier) {
  return { ...data, tier, listing_offer: "" };
}

export function canPublishPreSpree(data, { enabled = true, now = new Date() } = {}) {
  return enabled && isPreSpreeSelected(data) && isPreSpreeEligible(data, now);
}
