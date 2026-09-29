import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function distanceFeet(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = value => Number(value) * Math.PI / 180;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a)) * 3.28084;
}

async function verifyClaimAddress(base44, spot) {
  const currentUser = await base44.auth.me().catch(() => null);
  if (!currentUser) return { ok: false, status: 'unauthorized', error: 'Sign in to approve or claim this Halloween Spot.' };
  const data = currentUser.data || {};
  const verified = currentUser.primary_address_verified === true || currentUser.address_verified === true ||
    currentUser.address_confirmation_status === 'confirmed' || data.primary_address_verified === true ||
    data.address_verified === true || data.address_confirmation_status === 'confirmed';
  const lat = currentUser.primary_latitude ?? currentUser.address_lat ?? data.primary_latitude ?? data.address_lat;
  const lng = currentUser.primary_longitude ?? currentUser.address_lng ?? data.primary_longitude ?? data.address_lng;
  if (!verified || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return { ok: false, status: 'needs_address_verification', error: 'Verify your Yardit home address at this property before approving or claiming this Halloween Spot.' };
  }
  if (!Number.isFinite(Number(spot.latitude)) || !Number.isFinite(Number(spot.longitude)) ||
      distanceFeet(lat, lng, spot.latitude, spot.longitude) > 150) {
    return { ok: false, status: 'address_mismatch', error: 'Your verified Yardit home address must match this Halloween Spot.' };
  }
  return { ok: true, user: currentUser };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const token = typeof payload.token === 'string' ? payload.token.trim() : '';
    const assistedId = typeof payload.assistedId === 'string' ? payload.assistedId.trim() : '';
    const action = payload.action || '';
    if ((!token && !assistedId) || (token && assistedId)) return Response.json({ status: 'not_found' });

    // Address search never supplies a flyer token. Its ID is only a lookup key, not authorization.
    const records = await base44.asServiceRole.entities.AssistedHalloweenSpot.filter(token ? { assisted_qr_token: token } : { id: assistedId });
    if (records.length > 1) return Response.json({ status: 'duplicate_token' }, { status: 409 });
    const assisted = records[0];
    if (!assisted || (token && (assisted.assisted_qr_token !== token || token === '__invalidated__'))) return Response.json({ status: 'not_found' });
    const publicAssisted = record => ({ id: record.id, assisted_status: record.assisted_status });
    const locations = await base44.asServiceRole.entities.Location.filter({ id: assisted.location_id });
    const spot = locations[0];
    if (!spot) return Response.json({ status: 'spot_missing' });

    if (action === 'check_address') {
      if (!assistedId) return Response.json({ status: 'not_found' });
      const verification = await verifyClaimAddress(base44, spot);
      return Response.json({ status: verification.ok ? 'verified' : verification.status, error: verification.error });
    }

    if (action === 'claim_complete') {
      if (assisted.assisted_status !== 'assisted_active_unclaimed') {
        return Response.json({ status: 'error', error: 'The homeowner must approve this Halloween Spot before it can be claimed.' }, { status: 400 });
      }
      const verification = await verifyClaimAddress(base44, spot);
      if (!verification.ok) return Response.json({ status: verification.status, error: verification.error, spot, assisted: publicAssisted(assisted) });
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Location.update(spot.id, { owner_user_id: verification.user.id, ownership_claimed_at: now });
      const updated = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: 'claimed_active', claimed_by_user_id: verification.user.id, claimed_at: now,
      });
      return Response.json({ status: 'claimed', spot: { ...spot, owner_user_id: verification.user.id }, assisted: publicAssisted(updated) });
    }

    if (assisted.assisted_status === 'assisted_declined') return Response.json({ status: 'declined' });
    if (assisted.assisted_status === 'claimed_active') return Response.json({ status: 'claimed', spot, assisted: publicAssisted(assisted) });
    if (assisted.assisted_status === 'assisted_active_unclaimed') return Response.json({ status: 'approved', spot, assisted: publicAssisted(assisted) });
    if (assisted.assisted_status !== 'pending_owner_approval') return Response.json({ status: 'expired' });
    const expiresAt = new Date(assisted.assisted_qr_expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      const updated = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, { assisted_status: 'assisted_expired' });
      return Response.json({ status: 'expired', assisted: publicAssisted(updated) });
    }
    if (!action) return Response.json({ status: 'ok', spot, assisted: publicAssisted(assisted), approval_source: token ? 'legacy_token_link' : 'address_search' });

    if (action === 'approve') {
      // Approval always requires the signed-in homeowner's verified address to
      // match this exact property. A token may locate a record, but never
      // authorizes approval by itself.
      const verification = await verifyClaimAddress(base44, spot);
      if (!verification.ok) {
        return Response.json({ status: verification.status, error: verification.error }, { status: 403 });
      }
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Location.update(spot.id, { status: 'active' });
      const updated = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: 'assisted_active_unclaimed', owner_approved_at: now,
      });
      return Response.json({ status: 'approved', spot: { ...spot, status: 'active' }, assisted: publicAssisted(updated) });
    }

    if (action === 'decline' && token) {
      const updated = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: 'assisted_declined', owner_declined_at: new Date().toISOString(), assisted_qr_token: '__invalidated__',
      });
      await base44.asServiceRole.entities.Location.update(spot.id, { status: 'inactive' });
      return Response.json({ status: 'declined', assisted: publicAssisted(updated) });
    }
    return Response.json({ status: 'error', error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('resolveAssistedHalloweenSpot error:', error?.message || error);
    return Response.json({ error: 'Failed to resolve assisted Halloween Spot.' }, { status: 500 });
  }
}