import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const listingId = body?.listing_id;
    const targetTier = body?.target_tier;

    if (!listingId || !targetTier) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const listings = await base44.entities.Listing.filter({ id: listingId });
    const listing = listings?.[0];

    if (!listing) {
      return Response.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.ownerUserId !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = listing.listingType === 'event'
      ? {
          tier: targetTier,
          event_tier: targetTier,
          pricePaid: listing.pricePaid,
        }
      : {
          tier: targetTier,
          pricePaid: listing.pricePaid,
        };

    const updated = await base44.entities.Listing.update(listingId, updateData);
    return Response.json({ success: true, listing: updated });
  } catch (error) {
    console.error('applyListingUpgrade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});