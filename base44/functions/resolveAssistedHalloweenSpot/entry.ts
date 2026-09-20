import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
      const isClaiming = !!claimUserId;
      await base44.asServiceRole.entities.Location.update(spot.id, {
        status: 'active',
        ...(isClaiming ? { owner_user_id: claimUserId, ownership_claimed_at: now } : {}),
      });
      const updatedAssisted = await base44.asServiceRole.entities.AssistedHalloweenSpot.update(assisted.id, {
        assisted_status: isClaiming ? 'claimed_active' : 'assisted_active_unclaimed',
        owner_approved_at: now,
        ...(isClaiming ? { claimed_by_user_id: claimUserId, claimed_at: now } : {}),
      });
      const updatedSpot = (await base44.asServiceRole.entities.Location.filter({ id: spot.id }))[0] || spot;
      return Response.json({ status: isClaiming ? 'claimed' : 'approved', spot: updatedSpot, assisted: updatedAssisted });
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