import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const NEIGHBORHOOD_MIN_HOMES = 5;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function getApprovedHomesCount(requests = []) {
  return (requests || []).filter((request) => request?.removed_by_eo !== true && normalizeNeighborhoodJoinStatus(request.status) === 'approved').length + 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const listings = await base44.asServiceRole.entities.Listing.filter({ listingType: 'neighborhood_sale' });
    const now = new Date();
    const downgraded = [];

    for (const listing of listings) {
      if (listing.event_state === 'downgraded' || listing.event_state === 'canceled') continue;
      if (!listing.startDateTime) continue;

      const start = new Date(listing.startDateTime);
      if (Number.isNaN(start.getTime())) continue;
      const msUntilStart = start.getTime() - now.getTime();
      if (msUntilStart > FORTY_EIGHT_HOURS_MS || msUntilStart < 0) continue;

      const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId: listing.id });
      const approvedHomes = getApprovedHomesCount(requests);
      if (approvedHomes >= NEIGHBORHOOD_MIN_HOMES) continue;

      await base44.asServiceRole.entities.Listing.update(listing.id, {
        event_state: 'downgraded',
        status: 'closed',
        activation_status: 'pending',
        statusReason: 'Neighborhood Sale downgraded: fewer than 5 approved homes by the 48-hour activation deadline.',
        homeCount: approvedHomes,
      });

      for (const request of requests) {
        await base44.asServiceRole.entities.JoinRequest.update(request.id, {
          status: 'denied',
          removed_by_eo: true,
          removed_at: now.toISOString(),
          removal_reason: 'downgraded_minimum_not_met',
        });

        if (request.listingId) {
          await base44.asServiceRole.entities.Listing.update(request.listingId, {
            neighborhood_join_status: 'denied',
            neighborhood_sale_id: null,
            payment_intent_status: 'none',
          });
        }

        if (request.requesterUserId) {
          await base44.asServiceRole.entities.Notification.create({
            userId: request.requesterUserId,
            user_id: request.requesterUserId,
            title: 'Neighborhood Sale Not Activated',
            message: `${listing.title || 'Neighborhood Sale'} did not reach the 5-home minimum and was downgraded.`,
            type: 'removed_from_neighborhood',
            metadata: {
              sale_listing_id: listing.id,
              requester_listing_id: request.listingId,
              requester_user_id: request.requesterUserId,
              event_title: listing.title,
            },
            read: false,
            is_read: false,
          });
        }
      }

      downgraded.push({ id: listing.id, approvedHomes });
    }

    return Response.json({ success: true, downgraded_count: downgraded.length, downgraded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});