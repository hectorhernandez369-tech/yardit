import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function distanceFeet(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (value) => Number(value) * Math.PI / 180;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a)) * 3.28084;
}

async function verifyClaimAddress(base44, claimUserId, spot) {
  const currentUser = await base44.auth.me().catch(() => null);
  if (!currentUser || String(currentUser.id) !== String(claimUserId)) {
    return { ok: false, status: 'unauthorized', error: 'Sign in to claim this Halloween Spot.' };
  }

  const data = currentUser.data || {};
  const verified =
    currentUser.primary_address_verified === true ||
    currentUser.address_verified === true ||
    currentUser.address_confirmation_status === 'confirmed' ||
    data.primary_address_verified === true ||
    data.address_verified === true ||
    data.address_confirmation_status === 'confirmed';

  const lat = currentUser.primary_latitude ?? currentUser.address_lat ?? data.primary_latitude ?? data.address_lat;
  const lng = currentUser.primary_longitude ?? currentUser.address_lng ?? data.primary_longitude ?? data.address_lng;

  if (!verified || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return {
      ok: false,
      status: 'needs_address_verification',
      error: 'Verify your Yardit home address before taking ownership of this Halloween Spot.',
    };
  }

  if (!Number.isFinite(Number(spot.latitude)) || !Number.isFinite(Number(spot.longitude)) ||
      distanceFeet(lat, lng, spot.latitude, spot.longitude) > 150) {
    return {
      ok: false,
      status: 'address_mismatch',
      error: 'Your verified Yardit home address does not match this Halloween Spot.',
    };
  }

  return { ok: true, user: currentUser };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const rawToken = String(payload.token || '').trim();
    const token = rawToken.startsWith('http')
      ? (() => { try { return new URL(rawToken).searchParams.get('token') || ''; } catch { return ''; } })()
      : rawToken;
    const action = payload.action || '';
    const claimUserId = payload.claimUserId || '';

    if (!token) return Response.json({ status: 'not_found' });

    const records = await base44.asServiceRole.entities.AssistedHalloweenSpot.filter({ assisted_qr_token: token });
    if (records.length > 1) return Response.json({ status: 'duplicate_token' }, { status: 409 });
    const assisted = records[0];
    if (!assisted) return Response.json({ status: 'not_found' });

    await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
      qr_scan_count: Number(assisted.qr_scan_count || 0) + 1,
    }).catch(() => {});

    const locations = await base44.asServiceRole.entities.Location.filter({ id: assisted.location_id });
    const spot = locations[0] || null;
    if (!spot) return Response.json({ status: 'spot_missing', assisted });

    if (action === 'claim_complete') {
      if (!claimUserId) return Response.json({ error: 'claimUserId is required', status: 'error' }, { status: 400 });
      if (assisted.assisted_status !== 'assisted_active_unclaimed') {
        return Response.json({ error: 'The homeowner must approve this Halloween Spot before it can be claimed.', status: 'error' }, { status: 400 });
      }
      const verification = await verifyClaimAddress(base44, claimUserId, spot);
      if (!verification.ok) {
        return Response.json({ status: verification.status, error: verification.error, spot, assisted });
      }
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Location.update(spot.id, {
        owner_user_id: claimUserId,
        ownership_claimed_at: now,
      });
      const updatedAssisted = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: 'claimed_active',
        claimed_by_user_id: claimUserId,
        claimed_at: now,
      });
      const updatedSpot = (await base44.asServiceRole.entities.Location.filter({ id: spot.id }))[0] || spot;
      return Response.json({ status: 'claimed', spot: updatedSpot, assisted: updatedAssisted });
    }

    if (assisted.assisted_status === 'assisted_declined') return Response.json({ status: 'declined', spot: null, assisted });
    if (assisted.assisted_status === 'claimed_active') return Response.json({ status: 'claimed', spot, assisted });
    if (assisted.assisted_status === 'assisted_active_unclaimed') return Response.json({ status: 'approved', spot, assisted });

    const expiresAt = new Date(assisted.assisted_qr_expires_at);
    if (expiresAt <= new Date() && assisted.assisted_status === 'pending_owner_approval') {
      const updatedAssisted = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: 'assisted_expired',
      });
      return Response.json({ status: 'expired', spot: null, assisted: updatedAssisted });
    }

    if (!action) return Response.json({ status: 'ok', spot, assisted });

    if (action === 'approve') {
      const now = new Date().toISOString();
      let verifiedClaim = false;
      let verification = null;
      if (claimUserId) {
        verification = await verifyClaimAddress(base44, claimUserId, spot);
        verifiedClaim = verification.ok === true;
      }
      await base44.asServiceRole.entities.Location.update(spot.id, {
        status: 'active',
        ...(verifiedClaim ? { owner_user_id: claimUserId, ownership_claimed_at: now } : {}),
      });
      const updatedAssisted = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: verifiedClaim ? 'claimed_active' : 'assisted_active_unclaimed',
        owner_approved_at: now,
        ...(verifiedClaim ? { claimed_by_user_id: claimUserId, claimed_at: now } : {}),
      });
      const updatedSpot = (await base44.asServiceRole.entities.Location.filter({ id: spot.id }))[0] || spot;
      return Response.json({
        status: verifiedClaim ? 'claimed' : 'approved',
        spot: updatedSpot,
        assisted: updatedAssisted,
        claim_status: verification && !verification.ok ? verification.status : undefined,
        claim_error: verification && !verification.ok ? verification.error : undefined,
      });
    }

    if (action === 'decline') {
      const now = new Date().toISOString();
      const updatedAssisted = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: 'assisted_declined',
        owner_declined_at: now,
        assisted_qr_token: '__invalidated__',
      });
      await base44.asServiceRole.entities.Location.update(spot.id, { status: 'inactive' });
      return Response.json({ status: 'declined', spot: null, assisted: updatedAssisted });
    }

    return Response.json({ status: 'ok', spot, assisted });
  } catch (error) {
    console.error('resolveAssistedHalloweenSpot error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to resolve assisted Halloween Spot.' }, { status: 500 });
  }
});