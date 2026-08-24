import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const NEIGHBORHOOD_MAX_HOMES = 25;
const NEIGHBORHOOD_MIN_HOMES = 5;

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase().trim();
  if (['approved', 'accepted', 'active'].includes(value)) return 'approved';
  if (['denied', 'declined', 'rejected', 'removed'].includes(value)) return 'denied';
  return 'pending';
}

function isLockedSale(sale) {
  const state = String(sale?.event_state || '').toLowerCase();
  const status = String(sale?.status || '').toLowerCase();
  const startsAt = sale?.startDateTime ? new Date(sale.startDateTime) : null;
  const hasStarted = startsAt && !Number.isNaN(startsAt.getTime()) && new Date() >= startsAt;
  return state === 'activated_locked' || state === 'active' || (status === 'active' && hasStarted);
}

function isExistingListingRequest(joinRequest) {
  return joinRequest?.participant_origin_snapshot === 'existing_listing';
}

function buildDetachPatch(joinRequest) {
  if (isExistingListingRequest(joinRequest)) {
    return {
      neighborhood_join_status: 'none',
      neighborhood_sale_id: null,
      participant_origin: 'standalone',
      origin_sale_listing_id: null,
      hold_deadline_at: null,
    };
  }
  return {
    neighborhood_join_status: 'denied',
    neighborhood_sale_id: null,
    payment_intent_status: 'none',
    hold_deadline_at: null,
  };
}

function canManageSale(user, sale) {
  if (!user || !sale) return false;
  if (sale.ownerUserId === user.id) return true;
  if (sale.co_host_user_id === user.id && ['accepted', 'active'].includes(String(sale.co_host_status || '').toLowerCase())) return true;
  return ['admin', 'master', 'super_master', 'supervisor'].includes(String(user.role || '').toLowerCase());
}

async function getSale(base44, saleListingId) {
  const sales = await base44.asServiceRole.entities.Listing.filter({ id: saleListingId });
  return sales[0] || null;
}

async function getJoinRequest(base44, requestId) {
  const requests = await base44.asServiceRole.entities.JoinRequest.filter({ id: requestId });
  return requests[0] || null;
}

async function getRequests(base44, saleListingId) {
  return await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId });
}

function countVisibleHomes(sale, requests) {
  const organizerCount = sale?.organizer_participation === 'organizing_only' ? 0 : 1;
  const approvedParticipants = requests.filter((request) =>
    normalizeStatus(request.status) === 'approved' &&
    request.removed_by_eo !== true &&
    request.removed_by_listing_owner !== true
  ).length;
  return organizerCount + approvedParticipants;
}

async function syncSale(base44, saleListingId) {
  const sale = await getSale(base44, saleListingId);
  if (!sale) return null;

  const requests = await getRequests(base44, saleListingId);
  const homeCount = countVisibleHomes(sale, requests);
  const paidAmount = Number(sale.pricePaid || 0);
  const nextStatus = sale.status === 'active' || paidAmount > 0 || sale.payment_intent_status === 'captured'
    ? 'active'
    : homeCount >= NEIGHBORHOOD_MIN_HOMES
      ? 'ready_for_payment'
      : 'collecting_participants';

  const nextEventState = nextStatus === 'active' ? 'active' : 'pending_activation';

  await base44.asServiceRole.entities.Listing.update(saleListingId, {
    status: nextStatus,
    event_state: nextEventState,
    activation_status: nextStatus === 'active' ? 'active' : 'pending',
    homeCount,
  });

  return { homeCount, nextStatus };
}

async function notify(base44, data) {
  const notification = {
    userId: data.userId,
    user_id: data.userId,
    title: data.title,
    message: data.message,
    type: data.type,
    related_entity_type: data.relatedEntityType || 'JoinRequest',
    related_entity_id: data.relatedEntityId,
    metadata: data.metadata || {},
    read: false,
    is_read: false,
    delivery_methods: ['push', 'bell'],
    deep_link: data.deepLink || '/Notifications',
    dedupe_key: data.dedupeKey || `${data.type}_${data.userId}_${data.relatedEntityId || 'general'}`,
    registry_status: 'active',
    registry_version: '2026-08-24',
  };
  const response = await base44.asServiceRole.functions.invoke('deliverNotificationPush', notification);
  return response?.data || response || {};
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const requestId = String(payload.requestId || '').trim();
    const saleListingId = String(payload.saleListingId || '').trim();
    const action = String(payload.action || '').trim().toLowerCase();

    if (!requestId || !saleListingId || !['approve', 'deny', 'remove'].includes(action)) {
      return Response.json({ error: 'Invalid join request action.' }, { status: 400 });
    }

    const sale = await getSale(base44, saleListingId);
    if (!sale || sale.listingType !== 'neighborhood_sale' || sale.status === 'draft') {
      return Response.json({ error: 'Neighborhood Sale not found.' }, { status: 404 });
    }

    if (!canManageSale(user, sale)) {
      return Response.json({ error: 'You do not have permission to manage this Neighborhood Sale.' }, { status: 403 });
    }

    if (isLockedSale(sale)) {
      return Response.json({ error: 'This Neighborhood Sale is locked and participant changes must go through the report flow.' }, { status: 400 });
    }

    const joinRequest = await getJoinRequest(base44, requestId);
    if (!joinRequest || joinRequest.saleListingId !== saleListingId) {
      return Response.json({ error: 'Join request not found for this sale.' }, { status: 404 });
    }

    const requesterListingId = joinRequest.listingId;
    const requesterUserId = joinRequest.requesterUserId;
    const eventTitle = payload.eventTitle || sale.title || 'Neighborhood Sale';

    if (action === 'approve') {
      const requests = await getRequests(base44, saleListingId);
      const activeHomes = countVisibleHomes(sale, requests);
      const alreadyApproved = normalizeStatus(joinRequest.status) === 'approved' && joinRequest.removed_by_eo !== true;

      if (!alreadyApproved && activeHomes >= NEIGHBORHOOD_MAX_HOMES) {
        return Response.json({ error: 'Neighborhood Sale has reached the 25-home limit.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.JoinRequest.update(requestId, {
        status: 'approved',
        removed_by_eo: false,
        removed_at: null,
        removal_reason: null,
      });

      const approvePatch = isExistingListingRequest(joinRequest)
        ? {
            neighborhood_join_status: 'approved',
            hold_deadline_at: null,
            neighborhood_sale_id: saleListingId,
            participant_origin: 'existing_listing',
            origin_sale_listing_id: saleListingId,
          }
        : {
            neighborhood_join_status: 'approved',
            payment_intent_status: 'none',
            hold_deadline_at: null,
            neighborhood_sale_id: saleListingId,
            tier: 'free',
            pricePaid: 0,
            participant_origin: 'neighborhood_join',
            origin_sale_listing_id: saleListingId,
          };
      await base44.asServiceRole.entities.Listing.update(requesterListingId, approvePatch);

      await notify(base44, {
        userId: requesterUserId,
        title: 'Join Request Approved',
        message: `Approved — you joined ${eventTitle}`,
        type: 'join_request_accepted',
        relatedEntityId: requestId,
        metadata: { sale_listing_id: saleListingId, requester_listing_id: requesterListingId, requester_user_id: requesterUserId, event_title: eventTitle },
      });

      const syncResult = await syncSale(base44, saleListingId);
      if (syncResult?.homeCount === NEIGHBORHOOD_MIN_HOMES) {
        await notify(base44, {
          userId: user.id,
          title: 'Neighborhood Sale Committed',
          message: 'Your sale has reached 5 homes and is now committed.',
          type: 'neighborhood_sale_committed',
          relatedEntityId: requestId,
          metadata: { sale_listing_id: saleListingId, event_title: eventTitle },
        });
      }
    }

    if (action === 'deny') {
      await base44.asServiceRole.entities.JoinRequest.update(requestId, { status: 'denied' });
      await base44.asServiceRole.entities.Listing.update(requesterListingId, buildDetachPatch(joinRequest));
      await notify(base44, {
        userId: requesterUserId,
        title: 'Join Request Denied',
        message: 'Denied — your yard sale was not included with this Neighborhood Sale. Any existing listing keeps its original tier and standalone visibility.',
        type: 'join_request_denied',
        relatedEntityId: requestId,
        metadata: { sale_listing_id: saleListingId, requester_listing_id: requesterListingId, requester_user_id: requesterUserId, event_title: eventTitle },
      });
      await syncSale(base44, saleListingId);
    }

    if (action === 'remove') {
      await base44.asServiceRole.entities.JoinRequest.update(requestId, {
        status: 'denied',
        removed_by_eo: true,
        removed_at: new Date().toISOString(),
        removal_reason: 'eo_removed',
      });
      await base44.asServiceRole.entities.Listing.update(requesterListingId, buildDetachPatch(joinRequest));
      await notify(base44, {
        userId: requesterUserId,
        title: 'Removed from Neighborhood Sale',
        message: 'Removed from neighborhood sale',
        type: 'removed_from_neighborhood',
        relatedEntityId: requestId,
        metadata: { sale_listing_id: saleListingId, requester_listing_id: requesterListingId, requester_user_id: requesterUserId, event_title: eventTitle },
      });
      await syncSale(base44, saleListingId);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});