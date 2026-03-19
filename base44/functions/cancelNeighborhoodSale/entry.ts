import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESCUE_EXPIRY_DAYS = 7;

function normalizeNeighborhoodJoinStatus(status) {
  if (status === 'requested') return 'pending';
  if (status === 'approved_pending_payment') return 'approved';
  return status;
}

function buildRescueExpiry(now) {
  return new Date(now.getTime() + RESCUE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const saleListingId = payload.saleListingId;
    const reason = payload.reason || 'minimum_not_met_24h';
    const finalState = payload.finalState || 'downgraded';
    const deleteSale = payload.deleteSale === true;
    const internal = payload.internal === true;

    if (!saleListingId) {
      return Response.json({ error: 'saleListingId is required' }, { status: 400 });
    }

    const sales = await base44.asServiceRole.entities.Listing.filter({ id: saleListingId });
    const sale = sales[0];
    if (!sale) {
      return Response.json({ error: 'Neighborhood Sale not found' }, { status: 404 });
    }

    if (!internal) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (user.role !== 'admin' && user.id !== sale.ownerUserId) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date();
    const requests = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId });
    const participantListings = await base44.asServiceRole.entities.Listing.list();
    const listingById = new Map(participantListings.map((listing) => [listing.id, listing]));
    const processed = [];

    for (const request of requests) {
      const participantListing = listingById.get(request.listingId);
      const origin = request.participant_origin_snapshot || participantListing?.participant_origin || 'standalone';

      await base44.asServiceRole.entities.JoinRequest.update(request.id, {
        status: 'denied',
        removed_by_eo: true,
        removed_at: now.toISOString(),
        removal_reason: reason,
        cancellation_24h_sent_at: request.cancellation_24h_sent_at || now.toISOString(),
      });

      if (participantListing) {
        if (origin === 'neighborhood_invite') {
          const token = crypto.randomUUID();
          await base44.asServiceRole.entities.NeighborhoodTierRescue.create({
            token,
            user_id: request.requesterUserId,
            listing_id: participantListing.id,
            sale_listing_id: sale.id,
            addressText: participantListing.addressText,
            city: participantListing.city,
            state: participantListing.state,
            zip: participantListing.zip,
            lat: participantListing.lat,
            lng: participantListing.lng,
            status: 'active',
            expires_at: buildRescueExpiry(now),
          });

          if (request.requesterUserId) {
            await base44.asServiceRole.entities.Notification.create({
              userId: request.requesterUserId,
              user_id: request.requesterUserId,
              title: 'Neighborhood Sale Cancelled',
              message: `${sale.title || 'Neighborhood Sale'} did not reach the 5-home minimum. Choose a tier to keep your sale live.`,
              type: 'neighborhood_tier_rescue',
              related_entity_type: 'listing',
              related_entity_id: sale.id,
              metadata: {
                sale_listing_id: sale.id,
                requester_listing_id: participantListing.id,
                requester_user_id: request.requesterUserId,
                rescue_token: token,
                event_title: sale.title,
              },
              read: false,
              is_read: false,
            });
          }

          await base44.asServiceRole.entities.Listing.delete(participantListing.id);
          processed.push({ requestId: request.id, listingId: participantListing.id, origin, action: 'rescued_and_deleted' });
        } else {
          await base44.asServiceRole.entities.Listing.update(participantListing.id, {
            neighborhood_join_status: 'none',
            neighborhood_sale_id: null,
            payment_intent_status: 'none',
            hold_deadline_at: null,
          });

          if (request.requesterUserId) {
            await base44.asServiceRole.entities.Notification.create({
              userId: request.requesterUserId,
              user_id: request.requesterUserId,
              title: 'Neighborhood Sale Cancelled',
              message: `${sale.title || 'Neighborhood Sale'} was cancelled. Your listing stays active under its current tier.`,
              type: 'removed_from_neighborhood',
              related_entity_type: 'listing',
              related_entity_id: sale.id,
              metadata: {
                sale_listing_id: sale.id,
                requester_listing_id: participantListing.id,
                requester_user_id: request.requesterUserId,
                event_title: sale.title,
              },
              read: false,
              is_read: false,
            });
          }

          processed.push({ requestId: request.id, listingId: participantListing.id, origin, action: 'detached_only' });
        }
      }
    }

    if (!sale.host_cancellation_24h_sent_at && sale.ownerUserId) {
      await base44.asServiceRole.entities.Notification.create({
        userId: sale.ownerUserId,
        user_id: sale.ownerUserId,
        title: 'Neighborhood Sale Cancelled',
        message: `${sale.title || 'Neighborhood Sale'} did not reach the 5-home minimum by the 24-hour checkpoint.`,
        type: 'neighborhood_sale_cancelled',
        related_entity_type: 'listing',
        related_entity_id: sale.id,
        metadata: {
          sale_listing_id: sale.id,
          event_title: sale.title,
        },
        read: false,
        is_read: false,
      });
    }

    const pendingJobs = await base44.asServiceRole.entities.NeighborhoodDeadlineJob.filter({ sale_listing_id: sale.id, status: 'pending' });
    for (const job of pendingJobs) {
      await base44.asServiceRole.entities.NeighborhoodDeadlineJob.update(job.id, {
        status: 'cancelled',
        processed_at: now.toISOString(),
      });
    }

    if (deleteSale) {
      await base44.asServiceRole.entities.Listing.delete(sale.id);
    } else {
      await base44.asServiceRole.entities.Listing.update(sale.id, {
        event_state: finalState,
        status: 'closed',
        activation_status: 'pending',
        statusReason: 'Neighborhood Sale cancelled: fewer than 5 total homes at the 24-hour checkpoint.',
        host_cancellation_24h_sent_at: sale.host_cancellation_24h_sent_at || now.toISOString(),
      });
    }

    return Response.json({ success: true, saleListingId, processed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});