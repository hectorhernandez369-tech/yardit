export const NEIGHBORHOOD_EVENT_STATES = [
  "pending_activation",
  "activated",
  "coming_soon",
  "active",
  "expired",
  "downgraded",
  "canceled",
];

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

  return "pending_activation";
}

export function isNeighborhoodVisibleOnMap(listing, nowInput = new Date()) {
  return ["activated", "coming_soon", "active"].includes(deriveNeighborhoodEventState(listing, nowInput));
}

export function isNeighborhoodJoinAllowed(listing, nowInput = new Date()) {
  const eventState = deriveNeighborhoodEventState(listing, nowInput);
  return ["pending_activation", "activated", "coming_soon", "active"].includes(eventState);
}