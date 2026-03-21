export const NEIGHBORHOOD_EVENT_STATES = [
  "pending_activation",
  "activated",
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
  const activeRequests = (requests || []).filter((request) => request?.removed_by_eo !== true);
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

  if (explicit === "canceled" || status === "cancelled" || status === "canceled") return "canceled";
  if (explicit === "downgraded" || status === "downgraded") return "downgraded";
  if (end && !Number.isNaN(end.getTime()) && now > end) return "expired";
  if (explicit) return explicit;

  if (status === "collecting_participants" || status === "ready_for_payment" || status === "payment_pending") {
    return "pending_activation";
  }

  if (status === "active" || status === "payment_pending_adjustment") {
    if (start && !Number.isNaN(start.getTime()) && now < start) {
      return listing.advertising_started_at ? "coming_soon" : "activated";
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
  return ["pending_activation", "activated", "coming_soon", "active"].includes(eventState);
}

export function shouldShowListingOnMainMap(listing, nowInput = new Date()) {
  if (!listing) return false;

  if (listing.listingType === "neighborhood_sale") {
    return isNeighborhoodVisibleOnMap(listing, nowInput) && Number(listing.homeCount || 0) >= NEIGHBORHOOD_MIN_HOMES;
  }

  if (!["active", "scheduled"].includes(listing.status)) return false;

  const joinStatus = normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status);
  if (joinStatus !== "none" || !!listing.neighborhood_sale_id) return false;

  return true;
}

export function shouldShowListingInNeighborhoodParticipantView(participantListing, eventListing, request, nowInput = new Date()) {
  if (!participantListing || !eventListing || eventListing.listingType !== "neighborhood_sale") return false;
  if (!isNeighborhoodVisibleOnMap(eventListing, nowInput)) return false;
  if (participantListing.status !== "active") return false;
  if (participantListing.neighborhood_sale_id !== eventListing.id) return false;
  if (normalizeNeighborhoodJoinStatus(participantListing.neighborhood_join_status) !== "approved") return false;
  if (request?.removed_by_eo === true || normalizeNeighborhoodJoinStatus(request?.status) !== "approved") return false;

  return true;
}