// Keep campaign rules aligned with the server; tests verify this contract.
export const PRE_SPREE_CAMPAIGN = "pre_spree_2026";
export const PRE_SPREE_START = "2026-11-20";
export const PRE_SPREE_END = "2026-11-22";
export const PRE_SPREE_DATES = [PRE_SPREE_START, "2026-11-21", PRE_SPREE_END];

export function preSpreeLocalParts(now = new Date(), timeZone = "America/Los_Angeles") {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "America/Los_Angeles", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map(({ type, value }) => [type, value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  } catch { return { date: "", time: "" }; }
}

export function isPreSpreeOfferOpen(now = new Date(), timeZone) {
  const { date } = preSpreeLocalParts(now, timeZone);
  return date >= "2026-11-06" && date <= PRE_SPREE_END;
}

export function hasPreSpreeDates(listing) {
  const start = listing?.selectedRangeStartDate;
  const end = listing?.selectedRangeEndDate;
  return PRE_SPREE_DATES.includes(start) &&
    PRE_SPREE_DATES.includes(end) && start <= end;
}

export function hasFixedPreSpreeDates(listing) {
  return listing?.selectedRangeStartDate === PRE_SPREE_START && listing?.selectedRangeEndDate === PRE_SPREE_END;
}
export function isPreSpreeEligible(listing, now = new Date()) {
  const { date } = preSpreeLocalParts(now, listing?.timeZoneId);
  return listing?.listingType === "yard_sale" && listing?.tier === "featured" &&
    !listing?.is_demo_listing && !listing?.developer_schedule_override &&
    !listing?.neighborhood_sale_id && ["", "none"].includes(listing?.neighborhood_join_status || "") &&
    hasFixedPreSpreeDates(listing) && isPreSpreeOfferOpen(now, listing?.timeZoneId) &&
    date <= listing.selectedRangeEndDate;
}

export function isPreSpreeListing(listing) {
  return listing?.pre_spree_campaign === PRE_SPREE_CAMPAIGN &&
    listing?.listingType === "yard_sale" && listing?.tier === "featured" &&
    hasPreSpreeDates(listing) && !listing?.is_demo_listing && !listing?.neighborhood_sale_id;
}

export function isPreSpreePublished(listing, now = new Date()) {
  if (!isPreSpreeListing(listing) || !["scheduled", "active"].includes(listing.status)) return false;
  if (listing.cancelled_at || listing.canceled_at || listing.deleted_at || listing.removed_at || listing.expired_at) return false;
  const published = new Date(listing.pre_spree_published_at).getTime();
  const end = new Date(listing.endDateTime).getTime();
  return Number.isFinite(published) && Number.isFinite(end) && now.getTime() >= published && now.getTime() <= end;
}

export function isPreSpreeOpenNow(listing, now = new Date()) {
  if (!isPreSpreePublished(listing, now)) return false;
  const { date, time } = preSpreeLocalParts(now, listing.timeZoneId);
  return date >= listing.selectedRangeStartDate && date <= listing.selectedRangeEndDate &&
    time >= listing.openTime && time < listing.closeTime;
}
