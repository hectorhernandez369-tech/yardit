import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function clean(value) {
  return String(value || '').trim();
}

function buildAddressKey(user) {
  return [clean(user.street_address).toLowerCase(), clean(user.city).toLowerCase(), clean(user.state).toLowerCase(), clean(user.zip_code).toLowerCase()].join('|');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.street_address || !user.city || !user.state || !user.zip_code || !user.address_lat || !user.address_lng) {
      return Response.json({ success: true, matched: 0 });
    }

    const addressKey = buildAddressKey(user);
    const invites = await base44.asServiceRole.entities.NeighborhoodCoHostInvite.filter({ address_key: addressKey });
    const pendingInvites = invites.filter((invite) => invite.status === 'pending' && invite.organizer_user_id !== user.id);

    let matched = 0;
    for (const invite of pendingInvites) {
      if (invite.host_notification_sent && invite.host_user_id === user.id) continue;

      await base44.asServiceRole.entities.Notification.create({
        user_id: user.id,
        userId: user.id,
        title: 'Neighborhood Sale Co-Host Request',
        message: `${invite.organizer_name || 'An organizer'} wants to use your confirmed address for a Neighborhood Sale.`,
        type: 'co_host_invite',
        related_entity_type: 'NeighborhoodCoHostInvite',
        related_entity_id: invite.id,
        metadata: {
          invite_id: invite.id,
          organizer_user_id: invite.organizer_user_id,
          organizer_name: invite.organizer_name,
          event_title: invite.event_title,
          street_address: invite.street_address,
          city: invite.city,
          state: invite.state,
          zip_code: invite.zip_code,
        },
        read: false,
        is_read: false,
      });

      await base44.asServiceRole.entities.NeighborhoodCoHostInvite.update(invite.id, {
        host_user_id: user.id,
        host_email: user.email,
        host_name: user.full_name || user.email,
        host_notification_sent: true,
        address_lat: user.address_lat,
        address_lng: user.address_lng,
      });

      matched += 1;
    }

    return Response.json({ success: true, matched });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});