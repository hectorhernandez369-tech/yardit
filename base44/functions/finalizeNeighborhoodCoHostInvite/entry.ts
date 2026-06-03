import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function clean(value) {
  return String(value || '').trim();
}

function displayName(user) {
  return user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Co-host';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const listing = payload.data || {};

    if (payload.event?.type !== 'create' || listing.listingType !== 'neighborhood_sale' || !listing.co_host_user_id || listing.co_host_status !== 'pending') {
      return Response.json({ success: true, skipped: true });
    }

    if (listing.co_host_user_id === listing.ownerUserId) {
      return Response.json({ success: true, skipped: true, reason: 'owner_cannot_be_cohost' });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: listing.co_host_user_id });
    const coHost = users?.[0];

    if (!coHost) {
      return Response.json({ success: false, error: 'Selected co-host user not found.' }, { status: 404 });
    }

    const existingInvites = await base44.asServiceRole.entities.NeighborhoodCoHostInvite.filter({
      related_listing_id: listing.id,
      host_user_id: coHost.id,
    });

    const inviteRecord = existingInvites?.[0] || await base44.asServiceRole.entities.NeighborhoodCoHostInvite.create({
      organizer_user_id: listing.ownerUserId,
      organizer_email: listing.created_by || '',
      organizer_name: listing.organizer_name || 'Neighborhood Sale organizer',
      event_title: listing.title || 'Neighborhood Sale',
      related_listing_id: listing.id,
      address_key: `listing|${listing.id}|${coHost.id}`,
      street_address: clean(listing.addressText || listing.host_addressText || 'Neighborhood Sale'),
      city: clean(listing.city || listing.host_city || 'Unknown'),
      state: clean(listing.state || listing.host_state || 'XX').toUpperCase(),
      zip_code: clean(listing.zip || listing.host_zip || '00000'),
      host_user_id: coHost.id,
      host_email: coHost.email || '',
      host_name: displayName(coHost),
      status: 'pending',
    });

    await base44.asServiceRole.entities.Listing.update(listing.id, {
      cohost_invite_id: inviteRecord.id,
      cohost_invite_status: 'pending',
      co_host_status: 'pending',
    });

    await base44.asServiceRole.entities.Notification.create({
      userId: coHost.id,
      user_id: coHost.id,
      user_email: coHost.email || '',
      title: 'Neighborhood Sale Co-Host Invite',
      message: `You were invited to co-host "${listing.title || 'Neighborhood Sale'}".`,
      type: 'co_host_invite',
      related_entity_type: 'NeighborhoodCoHostInvite',
      related_entity_id: inviteRecord.id,
      read: false,
      is_read: false,
      metadata: {
        invite_id: inviteRecord.id,
        sale_listing_id: listing.id,
        event_title: listing.title || 'Neighborhood Sale',
        inviter_user_id: listing.ownerUserId,
        invite_type: 'co_host',
        invited_user_id: coHost.id,
      },
    });

    return Response.json({ success: true, invite: inviteRecord });
  } catch (error) {
    console.error('finalizeNeighborhoodCoHostInvite error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});