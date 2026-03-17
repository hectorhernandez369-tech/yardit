import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const NEIGHBORHOOD_MIN_HOMES = 5;
const NEIGHBORHOOD_MAX_HOMES = 25;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = [], includePendingPayment = false) {
  const activeRequests = (requests || []).filter((request) => request?.removed_by_eo !== true);
  const approvedCount = activeRequests.filter((request) => normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + 1;
  if (!includePendingPayment) return approvedCount;
  const pendingPaymentCount = activeRequests.filter((request) => request?.status === 'approved_pending_payment').length;
  return approvedCount + pendingPaymentCount;
}

function deriveNeighborhoodEventState(listing, nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing?.endDateTime ? new Date(listing.endDateTime) : null;
  const status = listing?.status;
  const explicit = listing?.event_state;

  if (explicit === 'canceled' || status === 'cancelled' || status === 'canceled') return 'canceled';
  if (explicit === 'downgraded' || status === 'downgraded') return 'downgraded';
  if (end && !Number.isNaN(end.getTime()) && now > end) return 'expired';
  if (explicit) return explicit;
  if (status === 'collecting_participants' || status === 'ready_for_payment' || status === 'payment_pending') return 'pending_activation';
  if (status === 'active' || status === 'payment_pending_adjustment') {
    if (start && !Number.isNaN(start.getTime()) && now < start) {
      return listing?.advertising_started_at ? 'coming_soon' : 'activated';
    }
    if (end && !Number.isNaN(end.getTime()) && now <= end) return 'active';
    return 'expired';
  }
  return 'pending_activation';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const listings = await base44.asServiceRole.entities.Listing.filter({ listingType: 'neighborhood_sale' });
    const now = new Date();
    const updates = [];

    for (const listing of listings) {
      const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId: listing.id });
      const approvedHomes = Math.min(NEIGHBORHOOD_MAX_HOMES, getApprovedHomesCount(requests, true));
      const nextEventState = deriveNeighborhoodEventState({ ...listing, homeCount: approvedHomes }, now);
      const nextStatus = nextEventState === 'active' || nextEventState === 'coming_soon' || nextEventState === 'activated'
        ? (listing.pricePaid > 0 ? 'active' : listing.status)
        : nextEventState === 'expired'
          ? 'expired'
          : nextEventState === 'pending_activation'
            ? (approvedHomes >= NEIGHBORHOOD_MIN_HOMES ? 'ready_for_payment' : 'collecting_participants')
            : listing.status;

      if (listing.event_state !== nextEventState || listing.homeCount !== approvedHomes || listing.status !== nextStatus) {
        await base44.asServiceRole.entities.Listing.update(listing.id, {
          ...listing,
          event_state: nextEventState,
          homeCount: approvedHomes,
          status: nextStatus,
        });
        updates.push({ id: listing.id, event_state: nextEventState, homeCount: approvedHomes, status: nextStatus });
      }
    }

    return Response.json({ success: true, updated: updates.length, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});