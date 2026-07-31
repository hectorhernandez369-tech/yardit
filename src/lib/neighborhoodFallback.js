const FALLBACK_RADIUS_FEET = 500;
const EXCLUDED_FALLBACK_STATUSES = new Set([
  "deleted",
  "removed",
  "cancelled",
  "canceled",
  "expired",
  "rejected",
  "denied",
  "closed",
  "suspended",
  "hidden",
]);

export const FALLBACK_ACTION_CANCEL = "cancel";
export const FALLBACK_ACTION_PREMIUM = "premium_host_listing";

export function getDistanceFeet(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== "number" || typeof lon1 !== "number" || typeof lat2 !== "number" || typeof lon2 !== "number") return Infinity;
  const radiusFeet = 20902231;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radiusFeet * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function datesOverlap(listing, sale) {
  const listingStart = listing?.selectedRangeStartDate || listing?.startDateTime?.slice?.(0, 10);
  const listingEnd = listing?.selectedRangeEndDate || listing?.endDateTime?.slice?.(0, 10);
  const saleStart = sale?.selectedRangeStartDate || sale?.startDateTime?.slice?.(0, 10);
  const saleEnd = sale?.selectedRangeEndDate || sale?.endDateTime?.slice?.(0, 10);
  if (!listingStart || !listingEnd || !saleStart || !saleEnd) return false;
  return listingStart <= saleEnd && listingEnd >= saleStart;
}

export function getFallbackListingEligibility(listing, sale, organizerUserId) {
  if (!listing) return { ok: false, reason: "Listing was not found." };
  if (listing.ownerUserId !== organizerUserId) return { ok: false, reason: "Listing is not owned by the Neighborhood Sale organizer." };
  if (listing.listingType !== "yard_sale") return { ok: false, reason: "Listing must be a residential Yard Sale." };
  if (EXCLUDED_FALLBACK_STATUSES.has(String(listing.status || "").toLowerCase())) return { ok: false, reason: "Listing is no longer active or eligible." };
  if (!datesOverlap(listing, sale)) return { ok: false, reason: "Listing dates must overlap the Neighborhood Sale dates." };
  const centerLat = sale?.event_center_lat ?? sale?.lat;
  const centerLng = sale?.event_center_lng ?? sale?.lng;
  if (getDistanceFeet(listing.lat, listing.lng, centerLat, centerLng) > FALLBACK_RADIUS_FEET) return { ok: false, reason: "Listing must be within the Neighborhood Sale radius." };
  if (listing.neighborhood_sale_id && listing.neighborhood_sale_id !== sale?.id) return { ok: false, reason: "Listing is already connected to another Neighborhood Sale." };
  return { ok: true, reason: "Eligible" };
}

export function getEligibleFallbackListings(listings = [], sale, organizerUserId) {
  return (listings || []).filter((listing) => getFallbackListingEligibility(listing, sale, organizerUserId).ok);
}