/**
 * Yardit List View Pipeline
 * Single source of truth for List View filtering, sorting, and search.
 * Does NOT affect Map View.
 */

import { deriveNeighborhoodEventState } from "@/lib/neighborhoodSaleState";
import { isPublishedVendorEvent, toVendorEventListing } from "@/lib/vendorEvents";
import { isListingVisible, getListingMapVisibilityState } from "@/lib/listingVisibility";
import { residentialCategoriesMatch } from "@/lib/residentialCategories";

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------
export function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return Infinity;
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Tier priority (lower number = higher rank)
// ---------------------------------------------------------------------------
function getTierPriority(listing) {
  if (listing?.listingType === "event" || listing?.is_vendor_event) {
    const eventAddOns = !listing?.is_vendor_event ? (listing?.event_add_ons || {}) : {};
    const t = listing?.is_vendor_event
      ? (listing?.event_tier || listing?.tier)
      : eventAddOns.marquee
      ? "marquee"
      : eventAddOns.premium_visibility
      ? "premium"
      : "featured";
    return { marquee: 1, premium: 2, featured: 3, event: 3, basic: 4 }[t] ?? 4;
  }
  if (listing?.listingType === "neighborhood_sale") return 5;
  return { premium: 6, featured: 7, basic: 8, free: 9 }[listing?.tier] ?? 9;
}

// ---------------------------------------------------------------------------
// Public visibility gate
// ---------------------------------------------------------------------------
export function isListingPubliclyVisible(listing, now = new Date()) {
  return isListingVisible(listing, null, { now, viewingOwnerPreviewMode: false });
}

// ---------------------------------------------------------------------------
// Fuzzy / smart search
// ---------------------------------------------------------------------------
function levenshtein(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a ? a.length : 0;
  if (a === b) return 0;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function wordMatches(queryWord, candidateWord) {
  if (candidateWord.includes(queryWord)) return true;
  if (Math.abs(candidateWord.length - queryWord.length) > 3) return false;
  return levenshtein(queryWord, candidateWord) <= Math.max(1, Math.floor(queryWord.length / 4));
}

function fieldMatches(query, field) {
  if (!query || !field) return false;
  const q = String(query).toLowerCase().trim();
  const f = String(field).toLowerCase();
  if (f.includes(q)) return true;
  const qWords = q.split(/\s+/).filter(Boolean);
  const fWords = f.split(/[\s,.\-/#@()]+/).filter(Boolean);
  return qWords.every(qw => fWords.some(fw => wordMatches(qw, fw)));
}

export function listingMatchesSearch(listing, query) {
  if (!query || !query.trim()) return true;
  const q = query.trim();
  const fields = [
    listing.title,
    listing.event_name,
    listing.description,
    listing.event_description,
    listing.city,
    listing.state,
    listing.zip,
    listing.addressText,
    listing.display_address,
    listing.address_text,
    listing.geocoded_address,
    listing.listingNumber,
    listing.listingType,
    listing.category,
    listing.collectible_type,
    listing.event_category,
    listing.event_type,
    listing.listingType === "event" ? "event" : null,
    listing.listingType === "neighborhood_sale" ? "neighborhood sale" : null,
    listing.listingType === "yard_sale" ? "yard sale" : null,
    ...(listing.categories || []),
  ].filter(Boolean);

  return fields.some(f => fieldMatches(q, f));
}

// ---------------------------------------------------------------------------
// Date filter helpers
// ---------------------------------------------------------------------------
function getWeekendRange(now) {
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = day <= 6 ? (6 - day) : 0;
  const sat = new Date(now);
  sat.setHours(0, 0, 0, 0);
  sat.setDate(sat.getDate() + (day === 0 ? -1 : daysUntilSat));
  const sun = new Date(sat);
  sun.setDate(sun.getDate() + 1);
  sun.setHours(23, 59, 59, 999);
  return { start: sat, end: sun };
}

function listingMatchesDate(listing, dateFilter, now) {
  if (!dateFilter || dateFilter === "all") return true;
  const start = listing.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing.endDateTime ? new Date(listing.endDateTime) : null;

  if (dateFilter === "today") {
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    if (!start || !end) return false;
    return start <= todayEnd && end >= todayStart;
  }

  if (dateFilter === "weekend") {
    const { start: wStart, end: wEnd } = getWeekendRange(now);
    if (!start || !end) return false;
    return start <= wEnd && end >= wStart;
  }

  if (dateFilter === "upcoming") {
    if (!start) return false;
    return start >= now;
  }

  // Custom date string (YYYY-MM-DD) — check if listing overlaps that day
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
    const dayStart = new Date(dateFilter + "T00:00:00");
    const dayEnd = new Date(dateFilter + "T23:59:59");
    if (!start || !end) return false;
    return start <= dayEnd && end >= dayStart;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * @param {object} params
 * @param {Array}  params.listings           - raw Listing entities from DB
 * @param {Array}  params.vendorEvents       - raw VendorEvent entities from DB
 * @param {object|null} params.userLocation  - { lat, lng } or null
 * @param {object|null} params.mapCenter     - { lat, lng } fallback
 * @param {string} params.searchQuery        - text search
 * @param {object} params.filters            - { tiers, types, categories, dateFilter, maxDistance }
 * @param {Date}   [params.now]
 * @returns {Array} sorted, filtered listing objects with _distance attached
 */
export function buildListViewResults({
  listings = [],
  vendorEvents = [],
  userLocation = null,
  mapCenter = null,
  searchQuery = "",
  filters = {},
  now = new Date(),
  currentUser = null,
  viewingOwnerPreviewMode = false,
}) {
  const {
    tiers = ["premium", "featured"],      // default: premium + featured only
    types = [],                           // empty = all types
    categories = [],                      // empty = all categories
    dateFilter = "all",
    maxDistance = null,                   // miles, null = no limit
  } = filters;

  const showAll = tiers.includes("all") || tiers.length === 0;

  // Reference point for distance
  const ref = userLocation
    ? userLocation
    : mapCenter
    ? { lat: mapCenter[0], lng: mapCenter[1] }
    : null;

  // Build base listing pool
  const visibilityContext = { now, viewingOwnerPreviewMode };
  const baseListings = listings.filter(l => isListingVisible(l, currentUser, visibilityContext)).map(l => {
    const neighborhoodState = l.listingType === "neighborhood_sale"
      ? deriveNeighborhoodEventState(l, now)
      : null;
    return { ...l, _neighborhoodState: neighborhoodState, mapState: getListingMapVisibilityState(l, currentUser, visibilityContext) };
  });

  // Add published vendor events
  const vendorEventListings = vendorEvents
    .filter(e => isPublishedVendorEvent(e, now))
    .map(e => toVendorEventListing(e, now));

  const combined = [...baseListings, ...vendorEventListings];

  // Attach distance
  const withDistance = combined.map(l => ({
    ...l,
    _distance: ref
      ? haversineDistanceMiles(ref.lat, ref.lng, l.lat, l.lng)
      : null,
  }));

  // Apply filters
  const filtered = withDistance.filter(l => {
    // Tier filter
    if (!showAll) {
      const t = l.tier || "free";
      const eventAddOns = !l.is_vendor_event ? (l.event_add_ons || {}) : {};
      const eventT = l.is_vendor_event
        ? (l.event_tier || l.tier || "basic")
        : eventAddOns.marquee
        ? "marquee"
        : eventAddOns.premium_visibility
        ? "premium"
        : "featured";
      const effectiveTier = (l.listingType === "event" || l.is_vendor_event) ? eventT : t;
      if (!tiers.includes(effectiveTier)) return false;
    }

    // Type filter
    if (types.length > 0) {
      const lt = l.is_vendor_event ? "event" : l.listingType;
      if (!types.includes(lt)) return false;
    }

    // Category filter
    if (categories.length > 0) {
      const listingCats = [...(l.categories || []), l.category, l.event_category, l.collectible_type].filter(Boolean);
      if (!residentialCategoriesMatch(categories, listingCats)) return false;
    }

    // Date filter
    if (!listingMatchesDate(l, dateFilter, now)) return false;

    // Distance filter
    if (maxDistance != null && l._distance != null && l._distance > maxDistance) return false;

    // Search
    if (!listingMatchesSearch(l, searchQuery)) return false;

    return true;
  });

  // Sort: distance (asc) → tier priority → soonest start
  filtered.sort((a, b) => {
    // Distance first
    if (a._distance !== null && b._distance !== null) {
      const distDiff = a._distance - b._distance;
      if (Math.abs(distDiff) > 0.01) return distDiff; // >~50ft apart
    } else if (a._distance !== null) return -1;
    else if (b._distance !== null) return 1;

    // Tier tiebreaker
    const tierDiff = getTierPriority(a) - getTierPriority(b);
    if (tierDiff !== 0) return tierDiff;

    // Date tiebreaker — soonest start first
    const aStart = a.startDateTime ? new Date(a.startDateTime).getTime() : Infinity;
    const bStart = b.startDateTime ? new Date(b.startDateTime).getTime() : Infinity;
    return aStart - bStart;
  });

  // Cap at 20
  return filtered.slice(0, 20);
}