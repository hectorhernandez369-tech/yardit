import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const NEIGHBORHOOD_MIN_HOMES = 5;
const NEIGHBORHOOD_MAX_HOMES = 25;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = [], sale = null) {
  const organizerCount = sale?.organizer_participation === 'organizing_only' ? 0 : 1;
  const activeRequests = (requests || []).filter((request) => request?.removed_by_eo !== true);
  return activeRequests.filter((request) => normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + organizerCount;
}

function deriveNeighborhoodEventState(listing, nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing?.endDateTime ? new Date(listing.endDateTime) : null;
  const status = listing?.status;
  const explicit = listing?.event_state;
  const isLockedActivation = status === 'activated_locked' || !!listing?.neighborhood_charge_locked_at || !!listing?.participant_lock_at;

  if (explicit === 'canceled' || status === 'cancelled' || status === 'canceled') return 'canceled';
  if (explicit === 'downgraded' || status === 'downgraded') return 'downgraded';
  if (end && !Number.isNaN(end.getTime()) && now > end) return 'expired';
  if (isLockedActivation || explicit === 'activated' || explicit === 'coming_soon' || explicit === 'active') {
    if (start && !Number.isNaN(start.getTime()) && now < start) {
      return listing?.advertising_started_at ? 'coming_soon' : 'activated';
    }
    if (end && !Number.isNaN(end.getTime()) && now <= end) return 'active';
    return 'expired';
  }
  if (explicit) return explicit;
  if (status === 'ready_for_payment') return 'committed';
  if (status === 'collecting_participants' || status === 'payment_pending') return 'pending_activation';
  if (status === 'active' || status === 'payment_pending_adjustment') {
    if (start && !Number.isNaN(start.getTime()) && now < start) {
      return listing?.advertising_started_at ? 'coming_soon' : 'activated';
    }
    if (end && !Number.isNaN(end.getTime()) && now <= end) return 'active';
    return 'expired';
  }
  return status === 'closed' ? (explicit || 'expired') : 'pending_activation';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const listings = await base44.asServiceRole.entities.Listing.filter({ listingType: 'neighborhood_sale' });
    const now = new Date();
    const updates = [];

    for (const listing of listings) {
      if (listing.status === 'draft') continue;
      const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId: listing.id });
      const approvedHomes = Math.min(NEIGHBORHOOD_MAX_HOMES, getApprovedHomesCount(requests, listing));
      const nextEventState = deriveNeighborhoodEventState({ ...listing, homeCount: approvedHomes }, now);
      const nextStatus = nextEventState === 'expired'
        ? 'expired'
        : nextEventState === 'downgraded' || nextEventState === 'canceled'
          ? 'closed'
          : listing.status === 'activated_locked' || listing.neighborhood_charge_locked_at
            ? 'activated_locked'
            : nextEventState === 'active' || nextEventState === 'coming_soon' || nextEventState === 'activated'
              ? 'active'
              : nextEventState === 'pending_activation' || nextEventState === 'committed'
                ? (approvedHomes >= NEIGHBORHOOD_MIN_HOMES ? 'ready_for_payment' : 'collecting_participants')
                : listing.status;

      let didUpdate = false;
      if (listing.event_state !== nextEventState || listing.homeCount !== approvedHomes || listing.status !== nextStatus) {
        await base44.asServiceRole.entities.Listing.update(listing.id, {
          event_state: nextEventState,
          homeCount: approvedHomes,
          status: nextStatus,
        });
        updates.push({ id: listing.id, event_state: nextEventState, homeCount: approvedHomes, status: nextStatus });
        didUpdate = true;
        
        await base44.asServiceRole.functions.invoke('syncNeighborhoodDeadlineJobs', {
          data: { ...listing, event_state: nextEventState, homeCount: approvedHomes, status: nextStatus },
          event: { type: 'update', entity_id: listing.id }
        }).catch(console.error);
      }

      // Safe guardrail: automatically invoke sync if a future path updated startDateTime without syncing
      if (!didUpdate && listing.startDateTime && !['canceled', 'downgraded', 'expired', 'closed'].includes(nextEventState)) {
        const start = new Date(listing.startDateTime);
        const expected48 = new Date(start.getTime() - 48 * 60 * 60 * 1000).toISOString();
        const expected24 = new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString();
        
        const existingJobs = await base44.asServiceRole.entities.NeighborhoodDeadlineJob.filter({ sale_listing_id: listing.id, status: 'pending' });
        const has48 = existingJobs.some(j => j.checkpoint_type === 'warning_48h' && j.run_at === expected48);
        const has24 = existingJobs.some(j => j.checkpoint_type === 'charge_24h' && j.run_at === expected24);
        
        if (!has48 || !has24) {
          await base44.asServiceRole.functions.invoke('syncNeighborhoodDeadlineJobs', {
            data: listing,
            event: { type: 'update', entity_id: listing.id }
          }).catch(console.error);
        }
      }
    }

    return Response.json({ success: true, updated: updates.length, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});