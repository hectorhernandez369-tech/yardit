import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function clean(value) {
  return String(value || '').trim();
}

function normalizeAddress(payload) {
  const street_address = clean(payload.street_address);
  const city = clean(payload.city);
  const state = clean(payload.state).toUpperCase();
  const zip_code = clean(payload.zip_code);
  const address_key = [street_address, city, state, zip_code].map((part) => part.toLowerCase()).join('|');
  return { street_address, city, state, zip_code, address_key };
}

function getDistanceFeet(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 20902231;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function findInvite(base44, organizerUserId, addressKey) {
  const invites = await base44.asServiceRole.entities.NeighborhoodCoHostInvite.filter({
    organizer_user_id: organizerUserId,
    address_key: addressKey,
  });
  return invites.find((invite) => invite.status !== 'declined') || invites[0] || null;
}

async function findMatchedHost(base44, organizerUserId, address) {
  const matches = await base44.asServiceRole.entities.User.filter({
    street_address: address.street_address,
    city: address.city,
    state: address.state,
    zip_code: address.zip_code,
  });

  return matches.find((candidate) => {
    if (!candidate || candidate.id === organizerUserId) return false;
    if (!candidate.address_lat || !candidate.address_lng) return false;
    if (candidate.accountStatus && candidate.accountStatus !== 'active') return false;
    return true;
  }) || null;
}

async function notifyMatchedHost(base44, invite, matchedHost) {
  if (!matchedHost || invite.host_notification_sent) return;

  await base44.asServiceRole.entities.Notification.create({
    user_id: matchedHost.id,
    userId: matchedHost.id,
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
    host_notification_sent: true,
    host_user_id: matchedHost.id,
    host_email: matchedHost.email,
    host_name: matchedHost.full_name || matchedHost.email,
    address_lat: matchedHost.address_lat,
    address_lng: matchedHost.address_lng,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    if (action === 'lookup' || action === 'request') {
      const address = normalizeAddress(payload);
      if (!address.street_address || !address.city || !address.state || !address.zip_code) {
        return Response.json({ error: 'Complete host address is required.' }, { status: 400 });
      }

      if (action === 'request') {
        const eventCenterLat = Number(payload.event_center_lat);
        const eventCenterLng = Number(payload.event_center_lng);
        const hostAddressLat = Number(payload.host_address_lat);
        const hostAddressLng = Number(payload.host_address_lng);

        if (!Number.isFinite(eventCenterLat) || !Number.isFinite(eventCenterLng) || !Number.isFinite(hostAddressLat) || !Number.isFinite(hostAddressLng)) {
          return Response.json({ error: 'Event center and host address coordinates are required.' }, { status: 400 });
        }

        const distanceFeet = getDistanceFeet(eventCenterLat, eventCenterLng, hostAddressLat, hostAddressLng);
        if (distanceFeet > 500) {
          return Response.json({ error: 'Host must be within 500 ft of the selected Neighborhood Sale center.' }, { status: 400 });
        }
      }

      const matchedHost = await findMatchedHost(base44, user.id, address);
      let invite = await findInvite(base44, user.id, address.address_key);

      if (action === 'request') {
        if (!invite) {
          invite = await base44.asServiceRole.entities.NeighborhoodCoHostInvite.create({
            organizer_user_id: user.id,
            organizer_email: user.email,
            organizer_name: user.full_name || user.email,
            event_title: clean(payload.event_title) || 'Neighborhood Sale',
            ...address,
            status: 'pending',
            ...(matchedHost ? {
              host_user_id: matchedHost.id,
              host_email: matchedHost.email,
              host_name: matchedHost.full_name || matchedHost.email,
              address_lat: matchedHost.address_lat,
              address_lng: matchedHost.address_lng,
            } : {}),
          });
        } else if (matchedHost) {
          await base44.asServiceRole.entities.NeighborhoodCoHostInvite.update(invite.id, {
            host_user_id: matchedHost.id,
            host_email: matchedHost.email,
            host_name: matchedHost.full_name || matchedHost.email,
            address_lat: matchedHost.address_lat,
            address_lng: matchedHost.address_lng,
          });
          invite = { ...invite, host_user_id: matchedHost.id, host_email: matchedHost.email, host_name: matchedHost.full_name || matchedHost.email, address_lat: matchedHost.address_lat, address_lng: matchedHost.address_lng };
        }

        if (matchedHost && invite.status === 'pending') {
          await notifyMatchedHost(base44, invite, matchedHost);
          invite = { ...invite, host_notification_sent: true };
        }
      }

      return Response.json({
        success: true,
        has_match: !!matchedHost,
        invite: invite ? {
          id: invite.id,
          status: invite.status,
          host_notification_sent: invite.host_notification_sent,
          street_address: invite.street_address,
          city: invite.city,
          state: invite.state,
          zip_code: invite.zip_code,
          address_lat: invite.address_lat,
          address_lng: invite.address_lng,
        } : null,
        matched_host: matchedHost ? {
          id: matchedHost.id,
          full_name: matchedHost.full_name || matchedHost.email,
          email: matchedHost.email,
          street_address: matchedHost.street_address,
          city: matchedHost.city,
          state: matchedHost.state,
          zip_code: matchedHost.zip_code,
          address_lat: matchedHost.address_lat,
          address_lng: matchedHost.address_lng,
        } : null,
      });
    }

    if (action === 'respond') {
      const inviteId = clean(payload.invite_id);
      const response = clean(payload.response);
      if (!inviteId || !['accepted', 'declined'].includes(response)) {
        return Response.json({ error: 'Invalid invite response.' }, { status: 400 });
      }

      const invites = await base44.asServiceRole.entities.NeighborhoodCoHostInvite.filter({ id: inviteId });
      const invite = invites[0];
      if (!invite) {
        return Response.json({ error: 'Invite not found.' }, { status: 404 });
      }

      const currentAddress = normalizeAddress(user);
      const currentAddressKey = [clean(user.street_address).toLowerCase(), clean(user.city).toLowerCase(), clean(user.state).toLowerCase(), clean(user.zip_code).toLowerCase()].join('|');

      if (invite.host_user_id && invite.host_user_id !== user.id && invite.address_key !== currentAddressKey) {
        return Response.json({ error: 'This invite is not assigned to your confirmed address.' }, { status: 403 });
      }

      if (!user.address_lat || !user.address_lng) {
        return Response.json({ error: 'Please confirm your address before responding.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.NeighborhoodCoHostInvite.update(invite.id, {
        status: response,
        responded_at: new Date().toISOString(),
        host_user_id: user.id,
        host_email: user.email,
        host_name: user.full_name || user.email,
        address_lat: user.address_lat,
        address_lng: user.address_lng,
      });

      await base44.asServiceRole.entities.Notification.create({
        user_id: invite.organizer_user_id,
        userId: invite.organizer_user_id,
        title: response === 'accepted' ? 'Co-Host Accepted' : 'Co-Host Declined',
        message: response === 'accepted'
          ? `${user.full_name || user.email} accepted your Neighborhood Sale co-host request.`
          : `${user.full_name || user.email} declined your Neighborhood Sale co-host request.`,
        type: response === 'accepted' ? 'co_host_accept' : 'co_host_decline',
        related_entity_type: 'NeighborhoodCoHostInvite',
        related_entity_id: invite.id,
        metadata: {
          invite_id: invite.id,
          street_address: invite.street_address,
          city: invite.city,
          state: invite.state,
          zip_code: invite.zip_code,
        },
        read: false,
        is_read: false,
      });

      return Response.json({
        success: true,
        invite: {
          id: invite.id,
          status: response,
          street_address: invite.street_address,
          city: invite.city,
          state: invite.state,
          zip_code: invite.zip_code,
          address_lat: user.address_lat,
          address_lng: user.address_lng,
        },
      });
    }

    return Response.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});