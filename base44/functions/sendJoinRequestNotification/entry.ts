import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const joinRequest = payload?.data;

    if (!joinRequest?.id || !joinRequest?.ownerUserId || !joinRequest?.requesterUserId || !joinRequest?.saleListingId) {
      return Response.json({ skipped: true, reason: 'Missing join request fields' });
    }

    const existing = await base44.asServiceRole.entities.Notification.filter({
      type: 'join_request',
      user_id: joinRequest.ownerUserId,
    }, '-created_date', 20);

    const alreadySent = (existing || []).some((notification) =>
      notification?.metadata?.join_request_id === joinRequest.id ||
      (notification?.metadata?.sale_listing_id === joinRequest.saleListingId &&
       notification?.metadata?.requester_listing_id === joinRequest.listingId &&
       notification?.metadata?.requester_user_id === joinRequest.requesterUserId)
    );

    if (alreadySent) {
      return Response.json({ skipped: true, reason: 'Notification already exists' });
    }

    const sales = await base44.asServiceRole.entities.Listing.filter({ id: joinRequest.saleListingId }, '-created_date', 1);
    const sale = sales?.[0] || null;
    if (!sale || sale.status === 'draft') {
      return Response.json({ skipped: true, reason: 'Sale is not joinable' });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: joinRequest.requesterUserId }, '-created_date', 1);
    const requester = users?.[0] || null;

    const requesterName = requester?.full_name || requester?.email || 'Someone';
    const eventTitle = sale?.title || 'your Neighborhood Sale';

    const notification = {
      userId: joinRequest.ownerUserId,
      user_id: joinRequest.ownerUserId,
      title: 'New Join Request',
      message: `${requesterName} requested to join ${eventTitle}.`,
      type: 'join_request',
      related_entity_type: 'listing',
      related_entity_id: joinRequest.saleListingId,
      read: false,
      is_read: false,
      recipient: 'Neighborhood Sale organizer',
      trigger: 'A seller requests to join a Neighborhood Sale',
      delivery_methods: ['push', 'bell'],
      deep_link: '/MyListings',
      dedupe_key: `join_request_${joinRequest.id}_${joinRequest.ownerUserId}`,
      registry_status: 'active',
      registry_version: '2026-08-24',
      metadata: {
        join_request_id: joinRequest.id,
        sale_listing_id: joinRequest.saleListingId,
        requester_listing_id: joinRequest.listingId,
        requester_user_id: joinRequest.requesterUserId,
        requester_email: requester?.email || '',
        requester_name: requester?.full_name || '',
        event_title: eventTitle,
      },
    };
    const response = await base44.asServiceRole.functions.invoke('deliverNotificationPush', notification);
    const delivery = response?.data || response || {};
    return Response.json({ success: delivery.success === true, notification_id: delivery.history_notification_id || null, delivery });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});