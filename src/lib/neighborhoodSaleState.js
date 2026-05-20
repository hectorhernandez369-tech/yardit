export const NEIGHBORHOOD_EVENT_STATES = [
  "pending_activation",
  "committed",
  "activated",
  "activated_locked",
  "coming_soon",
  "active",
  "expired",
  "downgraded",
  "canceled",
];

export const NEIGHBORHOOD_MIN_HOMES = 5;
export const NEIGHBORHOOD_CREATION_MIN_LEAD_DAYS = 7;

export function normalizeNeighborhoodJoinStatus(status) {
  if (status === "requested") return "pending";
  if (status === "approved_pending_payment") return "approved";
  return status;
}

export function getNeighborhoodApprovedHomesCount(requests = [], options = {}) {
  const { includeOrganizer = true } = options;
  const activeRequests = (requests || []).filter(
    (request) =>
      request?.removed_by_eo !== true &&
      request?.removed_by_listing_owner !== true &&
      request?.status !== "canceled" &&
      request?.status !== "cancelled"
  );
  const approvedRequests = activeRequests.filter((request) => normalizeNeighborhoodJoinStatus(request.status) === "approved");
  return approvedRequests.length + (includeOrganizer ? 1 : 0);
}

export function getNeighborhoodCreationLeadTimeError(startValue, nowInput = new Date()) {
  if (!startValue) return null;
  const start = String(startValue).includes("T") ? new Date(startValue) : new Date(`${startValue}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  if (start.getTime() - now.getTime() < NEIGHBORHOOD_CREATION_MIN_LEAD_DAYS * 24 * 60 * 60 * 1000) {
    return "Neighborhood Sales must be scheduled at least 7 days in advance.";
  }
  return null;
}

export function deriveNeighborhoodEventState(listing, nowInput = new Date()) {
  if (!listing || listing.listingType !== "neighborhood_sale") return null;

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const start = listing.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing.endDateTime ? new Date(listing.endDateTime) : null;
  const status = listing.status;
  const explicit = NEIGHBORHOOD_EVENT_STATES.includes(listing.event_state) ? listing.event_state : null;
  const isLocked = Number(listing.pricePaid || 0) > 0 || listing.payment_intent_status === "captured";

  if (explicit === "canceled" || status === "cancelled" || status === "canceled") return "canceled";
  if (explicit === "downgraded" || status === "downgraded") return "downgraded";
  if (end && !Number.isNaN(end.getTime()) && now > end) return "expired";

  if (status === "ready_for_payment") return "committed";
  if (status === "collecting_participants" || status === "payment_pending") {
    return "pending_activation";
  }

  if (status === "active" || status === "payment_pending_adjustment" || explicit === "activated" || explicit === "activated_locked" || explicit === "coming_soon" || explicit === "active") {
    if (start && !Number.isNaN(start.getTime()) && now < start) {
      if (listing.advertising_started_at) return "coming_soon";
      return isLocked ? "activated_locked" : "activated";
    }
    if (end && !Number.isNaN(end.getTime()) && now <= end) {
      return "active";
    }
    return "expired";
  }

  return status === "closed" ? (listing.event_state || "expired") : "pending_activation";
}

export function isNeighborhoodVisibleOnMap(listing, nowInput = new Date()) {
  return ["coming_soon", "active"].includes(deriveNeighborhoodEventState(listing, nowInput));
}

export function isNeighborhoodJoinAllowed(listing, nowInput = new Date()) {
  const eventState = deriveNeighborhoodEventState(listing, nowInput);
  return eventState === "pending_activation";
}

export function shouldShowListingOnMainMap(listing, nowInput = new Date()) {
  if (!listing) return false;

  if (listing.listingType === "neighborhood_sale") {
    return isNeighborhoodVisibleOnMap(listing, nowInput) && Number(listing.homeCount || 0) >= NEIGHBORHOOD_MIN_HOMES;
  }

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);

  if (listing.listingType === "event") {
    const end = listing.endDateTime ? new Date(listing.endDateTime) : null;
    if (end && !Number.isNaN(end.getTime()) && now > end) return false;
    return ["active", "scheduled"].includes(listing.status || "active");
  }
  const start = listing.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing.endDateTime ? new Date(listing.endDateTime) : null;

  if (listing.status === "scheduled") {
    if (!start || Number.isNaN(start.getTime()) || now < start) return false;
    if (end && !Number.isNaN(end.getTime()) && now > end) return false;
  } else if (listing.status !== "active") {
    return false;
  }

  const joinStatus = normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status);
  if (joinStatus !== "none" || !!listing.neighborhood_sale_id) return false;

  return true;
}

/**
 * Returns true if the participant listing's date range overlaps the neighborhood sale's date range.
 * Overlap = participant start <= sale end AND participant end >= sale start (date-level comparison).
 */
export function doesListingOverlapNeighborhoodSale(participantListing, eventListing) {
  const pStart = participantListing?.selectedRangeStartDate || participantListing?.startDateTime?.slice(0, 10);
  const pEnd = participantListing?.selectedRangeEndDate || participantListing?.endDateTime?.slice(0, 10);
  const sStart = eventListing?.selectedRangeStartDate || eventListing?.startDateTime?.slice(0, 10);
  const sEnd = eventListing?.selectedRangeEndDate || eventListing?.endDateTime?.slice(0, 10);

  if (!pStart || !pEnd || !sStart || !sEnd) return false;

  return pStart <= sEnd && pEnd >= sStart;
}

/**
 * Returns the overlapping date window between a participant listing and neighborhood sale.
 * Returns { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } or null if no overlap.
 */
export function getParticipationOverlapWindow(participantListing, eventListing) {
  const pStart = participantListing?.selectedRangeStartDate || participantListing?.startDateTime?.slice(0, 10);
  const pEnd = participantListing?.selectedRangeEndDate || participantListing?.endDateTime?.slice(0, 10);
  const sStart = eventListing?.selectedRangeStartDate || eventListing?.startDateTime?.slice(0, 10);
  const sEnd = eventListing?.selectedRangeEndDate || eventListing?.endDateTime?.slice(0, 10);

  if (!pStart || !pEnd || !sStart || !sEnd) return null;

  const overlapStart = pStart > sStart ? pStart : sStart;
  const overlapEnd = pEnd < sEnd ? pEnd : sEnd;

  if (overlapStart > overlapEnd) return null;
  return { start: overlapStart, end: overlapEnd };
}

/**
 * Returns true if today falls within the participation overlap window.
 */
export function isWithinParticipationWindow(participantListing, eventListing, nowInput = new Date()) {
  const window = getParticipationOverlapWindow(participantListing, eventListing);
  if (!window) return false;
  const today = (nowInput instanceof Date ? nowInput : new Date(nowInput)).toISOString().slice(0, 10);
  return today >= window.start && today <= window.end;
}

export function shouldShowListingInNeighborhoodParticipantView(participantListing, eventListing, request, nowInput = new Date()) {
  if (!participantListing || !eventListing || eventListing.listingType !== "neighborhood_sale") return false;
  if (!isNeighborhoodVisibleOnMap(eventListing, nowInput)) return false;
  if (participantListing.status !== "active") return false;
  if (participantListing.neighborhood_sale_id !== eventListing.id) return false;
  if (normalizeNeighborhoodJoinStatus(participantListing.neighborhood_join_status) !== "approved") return false;
  if (request?.removed_by_eo === true || request?.removed_by_listing_owner === true) return false;
  if (request?.status === "canceled" || request?.status === "cancelled") return false;
  if (normalizeNeighborhoodJoinStatus(request?.status) !== "approved") return false;

  // Only show participant during the overlap window between their listing dates and the sale dates
  if (!isWithinParticipationWindow(participantListing, eventListing, nowInput)) return false;

  return true;
}