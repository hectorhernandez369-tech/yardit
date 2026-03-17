export function normalizeNeighborhoodJoinStatus(status) {
  if (status === "requested") return "pending";
  if (status === "approved_pending_payment") return "approved";
  return status;
}

export function deriveNeighborhoodEventState(listing, nowInput = new Date()) {
  if (!listing || listing.listingType !== "neighborhood_sale") return null;
  if (listing.event_state) return listing.event_state;

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const start = listing.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing.endDateTime ? new Date(listing.endDateTime) : null;
  const status = listing.status;

  if (status === "cancelled" || status === "canceled") return "canceled";
  if (status === "downgraded") return "downgraded";
  if (end && !Number.isNaN(end.getTime()) && now > end) return "expired";
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

export function shouldDisplayNeighborhoodEvent(eventState) {
  return ["activated", "coming_soon", "active"].includes(eventState);
}