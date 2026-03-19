import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const action = payload?.action || 'resolve';
    const token = payload?.token;

    if (!token) {
      return Response.json({ error: 'token is required' }, { status: 400 });
    }

    const rescues = await base44.asServiceRole.entities.NeighborhoodTierRescue.filter({ token });
    const rescue = rescues[0];

    if (!rescue) {
      return Response.json({ error: 'Rescue link not found' }, { status: 404 });
    }

    if (rescue.user_id !== user.id) {
      return Response.json({ error: 'This rescue link is not for your account' }, { status: 403 });
    }

    const now = new Date();
    const expiresAt = rescue.expires_at ? new Date(rescue.expires_at) : null;
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt <= now) {
      if (rescue.status !== 'expired') {
        await base44.asServiceRole.entities.NeighborhoodTierRescue.update(rescue.id, {
          status: 'expired',
        });
      }
      return Response.json({ error: 'This rescue link has expired' }, { status: 410 });
    }

    if (action === 'consume') {
      if (rescue.status !== 'pending') {
        return Response.json({ error: 'This rescue link is no longer available' }, { status: 409 });
      }

      await base44.asServiceRole.entities.NeighborhoodTierRescue.update(rescue.id, {
        status: 'used',
        used_at: now.toISOString(),
        rescue_output_listing_id: payload?.listingId || null,
      });

      return Response.json({ success: true, status: 'used' });
    }

    if (rescue.status !== 'pending') {
      return Response.json({ error: 'This rescue link is no longer available' }, { status: 409 });
    }

    return Response.json({
      success: true,
      rescue: {
        id: rescue.id,
        token: rescue.token,
        expires_at: rescue.expires_at,
      },
      prefill: {
        listingType: 'yard_sale',
        title: rescue.title || 'My Yard Sale',
        description: rescue.description || '',
        category: rescue.category || 'Miscellaneous',
        categories: rescue.categories?.length ? rescue.categories : ['Miscellaneous'],
        collectible_type: rescue.collectible_type || null,
        addressText: rescue.addressText,
        city: rescue.city,
        state: rescue.state,
        zip: rescue.zip,
        lat: rescue.lat,
        lng: rescue.lng,
        participant_origin: 'standalone',
        neighborhood_join_status: 'none',
        neighborhood_sale_id: '',
        origin_sale_listing_id: null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});