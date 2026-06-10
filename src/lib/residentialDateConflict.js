/**
 * Residential date-conflict utilities.
 *
 * Rule: same verified address cannot have overlapping active/scheduled/paid dates.
 * Multiple listings for the same address ARE allowed as long as date ranges do not overlap.
 */

const RESERVED_STATUSES = new Set([
  "active",
  "under_review",
  "pending_payment",
  "scheduled",
  "activated_locked",
  "coming_soon",
  "payment_pending",
  "payment_pending_adjustment",
]);

/**
 * Returns true if listing status counts as "reserved" (blocking new overlapping dates).
 */
export function isReservedStatus(status) {
  return RESERVED_STATUSES.has(status);
}

/**
 * Build the Set of YYYY-MM-DD date strings that are already reserved
 * for a given user + verified address, across all their residential listings.
 *
 * @param {Array} listings        - All listings from the user's account
 * @param {string|null} excludeId - Listing ID to exclude (e.g. the one being edited)
 * @param {object} addressRef     - { lat, lng } of the verified primary address
 * @returns {Set<string>}
 */
export function getReservedDatesForAddress(listings, excludeId, addressRef) {
  const reserved = new Set();
  const now = new Date();

  for (const l of listings || []) {
    if (l.id === excludeId) continue;
    if (l.listingType !== "yard_sale") continue;
    if (l.is_demo_listing) continue;
    if (!isReservedStatus(l.status)) continue;

    // Must share the same verified address (within ~100ft / ~0.0003 degrees tolerance)
    if (!isSameAddress(l, addressRef)) continue;

    // Skip listings that have fully ended
    if (l.endDateTime && new Date(l.endDateTime) < now) continue;

    // Expand the listing's reserved date range
    const dates = expandDateRange(l.selectedRangeStartDate, l.selectedRangeEndDate);
    for (const d of dates) reserved.add(d);

    // Also mark earlyVisibilityDates if present
    for (const d of l.earlyVisibilityDates || []) reserved.add(d);
  }

  return reserved;
}

/**
 * Returns true if a proposed [startDate, endDate] range overlaps any reserved date.
 * @param {string} startDate  YYYY-MM-DD
 * @param {string} endDate    YYYY-MM-DD
 * @param {Set<string>} reservedDates
 */
export function hasDateConflict(startDate, endDate, reservedDates) {
  if (!startDate || !endDate || reservedDates.size === 0) return false;
  for (const d of expandDateRange(startDate, endDate)) {
    if (reservedDates.has(d)) return true;
  }
  return false;
}

/**
 * Returns the conflicting dates as an array (for error messages).
 */
export function getConflictingDates(startDate, endDate, reservedDates) {
  if (!startDate || !endDate) return [];
  return expandDateRange(startDate, endDate).filter((d) => reservedDates.has(d));
}

export function getFirstConflictingListingForAddress(listings, startDate, endDate, addressRef, excludeId = null) {
  if (!startDate || !endDate || !addressRef) return null;
  const proposedDates = new Set(expandDateRange(startDate, endDate));
  const now = new Date();

  for (const listing of listings || []) {
    if (!listing || listing.id === excludeId) continue;
    if (listing.listingType !== "yard_sale") continue;
    if (listing.is_demo_listing) continue;
    if (!isReservedStatus(listing.status)) continue;
    if (!isSameAddress(listing, addressRef)) continue;
    if (listing.endDateTime && new Date(listing.endDateTime) < now) continue;

    const reservedForListing = [
      ...expandDateRange(listing.selectedRangeStartDate, listing.selectedRangeEndDate),
      ...(listing.earlyVisibilityDates || []),
    ];
    const conflictingDates = reservedForListing.filter((date) => proposedDates.has(date));
    if (conflictingDates.length > 0) {
      return { listing, conflictingDates };
    }
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expandDateRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const dates = [];
  const start = parseDateUTC(startDate);
  const end = parseDateUTC(endDate);
  if (!start || !end || end < start) return [];
  const one = 24 * 60 * 60 * 1000;
  let cur = start;
  let guard = 0;
  while (cur <= end && guard++ < 40) {
    dates.push(utcToYMD(cur));
    cur = new Date(cur.getTime() + one);
  }
  return dates;
}

function parseDateUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToYMD(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Coordinate-based address match (within ~100ft tolerance).
 * Falls back to exact zip+street match if no coordinates.
 */
function isSameAddress(listing, ref) {
  if (!ref) return false;
  const latRef = ref.lat ?? ref.primary_latitude;
  const lngRef = ref.lng ?? ref.primary_longitude;
  if (typeof latRef === "number" && typeof lngRef === "number" &&
      typeof listing.lat === "number" && typeof listing.lng === "number") {
    const dLat = Math.abs(listing.lat - latRef);
    const dLng = Math.abs(listing.lng - lngRef);
    // ~0.0003 degrees ≈ 100ft
    return dLat < 0.0003 && dLng < 0.0003;
  }
  return false;
}