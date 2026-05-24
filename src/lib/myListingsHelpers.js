/**
 * myListingsHelpers.js
 * Pure helper utilities extracted from MyListings.jsx.
 * No side effects. No state. No imports from React.
 * Every function returns the exact same result as the original inline logic.
 */

import { getListingDisplayStatus } from "@/components/listing/listingDisplay";
import { shouldShowListingOnMainMap, isNeighborhoodVisibleOnMap } from "@/lib/neighborhoodSaleState";
import { getStateAbbreviation } from "@/lib/listingLocation";

// ─── Coordinates ────────────────────────────────────────────────────────────

export function getListingLatLng(listing) {
  const lat = listing?.lat ?? listing?.latitude ?? null;
  const lng = listing?.lng ?? listing?.longitude ?? null;
  return { lat, lng };
}

export function listingHasCoords(listing) {
  const { lat, lng } = getListingLatLng(listing);
  return !!lat && !!lng;
}

// ─── Listing Number ──────────────────────────────────────────────────────────

export function getListingNumberText(listing) {
  if (listing?.listingNumber) return listing.listingNumber;
  const st = getStateAbbreviation(listing?.state || "XX");
  const zp = (listing?.zip || "0000").slice(-4).padStart(4, "0");
  const idSuffix = (listing?.id || "00000").slice(-5).toLowerCase();
  return `${st}${zp}-${idSuffix}`;
}

// ─── Status / Visibility ─────────────────────────────────────────────────────

/** RULE 1: Past = terminated status, regardless of dates */
export function isListingPast(listing) {
  const status = listing?.status || "";
  return (
    status === "expired" ||
    status === "completed" ||
    status === "closed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "removed" ||
    status === "denied" ||
    status === "rejected" ||
    status === "suspended"
  );
}

/** RULE 1b: Also expired by displayStatus */
export function isListingEffectivelyPast(listing) {
  return isListingPast(listing) || listing?.displayStatus === "expired";
}

/** RULE 2: Active = currently visible on the map */
export function isListingActive(listing) {
  if (isListingPast(listing)) return false;
  const now = new Date();
  if (listing?.listingType === "neighborhood_sale") {
    return isNeighborhoodVisibleOnMap(listing, now);
  }
  return shouldShowListingOnMainMap(listing, now);
}

/** RULE 3: Pending = not past, not active yet */
export function isListingPending(listing) {
  return !isListingEffectivelyPast(listing) && !isListingActive(listing);
}

/** Statuses that allow direct self-cancel */
export function canDirectlyCancelListing(listing) {
  return [
    "active",
    "activated_locked",
    "payment_pending",
    "scheduled",
    "ready_for_payment",
    "payment_pending_adjustment",
    "under_review",
    "collecting_participants",
  ].includes(listing?.status);
}

/** Normalize all listings to include displayStatus */
export function normalizeListingsWithDisplayStatus(listings) {
  return listings.map((listing) => ({
    ...listing,
    displayStatus: getListingDisplayStatus(listing),
  }));
}

// ─── Assisted Listing Visibility ─────────────────────────────────────────────

/**
 * Returns true if the listing should be HIDDEN from My Listings.
 * Unclaimed assisted listings are hidden; claimed ones (ownerUserId === userId) are shown.
 */
export function shouldHideAssistedListing(listing, userId) {
  return (
    (listing.created_by_admin === true || listing.assisted_listing === true) &&
    listing.owner_type === "guest_assisted" &&
    listing.ownerUserId !== userId
  );
}

// ─── Co-Host Search ──────────────────────────────────────────────────────────

const CO_HOST_MATCH_CONFIGS = [
  { key: "name",    label: "Name",        getValue: (c) => `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "" },
  { key: "phone",   label: "Phone Number",getValue: (c) => c.phone || "" },
  { key: "address", label: "Address",     getValue: (c) => [c.street_address, c.city, getStateAbbreviation(c.state), c.zip_code].filter(Boolean).join(", ") },
  { key: "user_id", label: "User ID",     getValue: (c) => c.id || "" },
  { key: "email",   label: "Email",       getValue: (c) => c.email || "" },
];

function coHostMatchPriority(key) {
  if (key === "name")    return 5;
  if (key === "phone")   return 4;
  if (key === "email")   return 3;
  if (key === "address") return 2;
  return 1;
}

/**
 * Filter and rank users for the co-host search.
 * @param {Array} allUsers - full user list
 * @param {string} query - trimmed lowercase search query
 * @param {string} currentUserId - exclude the organizer themselves
 * @returns {Array} up to 8 matched candidates with matchedField attached
 */
export function filterCoHostCandidates(allUsers, query, currentUserId) {
  if (!query) return [];
  return allUsers
    .map((candidate) => {
      if (!candidate?.id || candidate.id === currentUserId) return null;
      const matches = CO_HOST_MATCH_CONFIGS
        .map((config) => {
          const value = String(config.getValue(candidate) || "").trim();
          if (!value) return null;
          const normalizedValue = value.toLowerCase();
          if (!normalizedValue.includes(query)) return null;
          return {
            key: config.key,
            label: config.label,
            value,
            exact: normalizedValue === query,
            startsWith: normalizedValue.startsWith(query),
            priority: coHostMatchPriority(config.key),
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.exact !== b.exact) return a.exact ? -1 : 1;
          if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
          return b.priority - a.priority;
        });
      if (!matches.length) return null;
      return { ...candidate, matchedField: matches[0] };
    })
    .filter(Boolean)
    .slice(0, 8);
}

// ─── Relist Payload Builder ───────────────────────────────────────────────────

/**
 * Builds the localStorage relist payload for a given listing.
 * Pure function — does NOT write to localStorage.
 * @returns {{ relistFromId: string, listingType: string, relistPrefill: object }}
 */
export function buildRelistPayload(listing) {
  const isEvent = listing.listingType === "event";
  const base = {
    relistFromId: listing.id,
    listingType: listing.listingType || "yard_sale",
  };

  if (isEvent) {
    base.relistPrefill = {
      listingType: "event",
      event_name: listing.event_name || listing.title || "",
      event_description: listing.event_description || listing.description || "",
      event_category: listing.event_category || listing.category || "",
      event_icon: listing.event_icon || "",
      event_photos: listing.event_photos || listing.photoUrls || [],
      display_address: listing.display_address || listing.address_text || listing.addressText || "",
      geocoded_address: listing.geocoded_address || "",
      location_source: listing.location_source || "search",
      address_text: listing.display_address || listing.address_text || listing.addressText || "",
      addressText: listing.display_address || listing.address_text || listing.addressText || "",
      city: listing.city || "",
      state: getStateAbbreviation(listing.state || ""),
      zip: listing.zip || "",
      lat: listing.lat ?? null,
      lng: listing.lng ?? null,
      event_start_date: "",
      event_end_date: "",
      event_start_time: "",
      event_end_time: "",
      start_datetime: "",
      end_datetime: "",
      startDateTime: "",
      endDateTime: "",
      event_tier: listing.event_tier || listing.tier || "basic",
      marquee_schedule_slots: listing.marquee_schedule_slots || [],
      marquee_flyer_url: listing.marquee_flyer_url || "",
      marquee_background_url: listing.marquee_background_url || "",
      event_logo_url: listing.event_logo_url || "",
    };
  } else {
    base.relistPrefill = {
      listingType: listing.listingType || "yard_sale",
      title: listing.title || "",
      description: listing.description || "",
      display_address: listing.display_address || listing.addressText || listing.street_address || listing.street || "",
      geocoded_address: listing.geocoded_address || "",
      location_source: listing.location_source || "search",
      addressText: listing.display_address || listing.addressText || listing.street_address || listing.street || "",
      city: listing.city || "",
      state: getStateAbbreviation(listing.state || ""),
      zip: listing.zip || listing.zip_code || "",
      lat: listing.lat ?? listing.latitude ?? null,
      lng: listing.lng ?? listing.longitude ?? null,
      tier: listing.tier || "free",
    };
  }

  return base;
}