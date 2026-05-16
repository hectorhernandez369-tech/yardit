import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const { token, action, claimUserId } = payload;

    if (!token) {
      return Response.json({ status: 'not_found' });
    }

    // Find the assisted listing by token
    const assistedRecords = await base44.asServiceRole.entities.AssistedListing.filter({
      assisted_qr_token: token,
    });
    const assisted = assistedRecords[0];

    if (!assisted) {
      return Response.json({ status: 'not_found' });
    }

    // Increment scan count on every load (regardless of action)
    await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
      qr_scan_count: (assisted.qr_scan_count || 0) + 1,
    });

    // Check if token was invalidated (declined)
    if (assisted.assisted_qr_token === '__invalidated__') {
      return Response.json({ status: 'declined' });
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(assisted.assisted_qr_expires_at);
    const isExpired = expiresAt <= now;

    // Fetch the listing
    const listings = await base44.asServiceRole.entities.Listing.filter({ id: assisted.listing_id });
    const listing = listings[0] || null;

    // Handle completed states — return them directly without checking expiry
    if (assisted.assisted_status === 'assisted_declined') {
      return Response.json({ status: 'declined', listing, assisted });
    }
    if (assisted.assisted_status === 'assisted_active_unclaimed') {
      return Response.json({ status: 'approved', listing, assisted });
    }
    if (assisted.assisted_status === 'assisted_active_claim_pending') {
      return Response.json({ status: 'claim_pending', listing, assisted });
    }
    if (assisted.assisted_status === 'claimed_active') {
      return Response.json({ status: 'claimed', listing, assisted });
    }

    // Check expiry for pending listings
    if (isExpired && assisted.assisted_status === 'pending_seller_approval') {
      // Mark as expired
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'assisted_expired',
      });
      return Response.json({ status: 'expired', listing: null, assisted });
    }

    // No action — just return the current state for display
    if (!action) {
      return Response.json({ status: 'ok', listing, assisted });
    }

    // Handle actions
    if (action === 'approve') {
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'assisted_active_unclaimed',
        seller_approved_at: now.toISOString(),
      });
      // Make listing visible
      await base44.asServiceRole.entities.Listing.update(assisted.listing_id, {
        status: 'active',
      });
      const updatedListings = await base44.asServiceRole.entities.Listing.filter({ id: assisted.listing_id });
      return Response.json({ status: 'approved', listing: updatedListings[0] || listing, assisted });
    }

    if (action === 'decline') {
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'assisted_declined',
        seller_declined_at: now.toISOString(),
        assisted_qr_token: '__invalidated__',
      });
      // Hide the listing
      await base44.asServiceRole.entities.Listing.update(assisted.listing_id, {
        status: 'hidden',
      });
      return Response.json({ status: 'declined', listing: null, assisted });
    }

    if (action === 'claim_pending') {
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'assisted_active_claim_pending',
        seller_approved_at: assisted.seller_approved_at || now.toISOString(),
      });
      // Make listing visible if not already
      if (listing && listing.status !== 'active') {
        await base44.asServiceRole.entities.Listing.update(assisted.listing_id, { status: 'active' });
      }
      return Response.json({ status: 'claim_pending', listing, assisted });
    }

    if (action === 'claim_complete' && claimUserId) {
      // Transfer listing ownership to the claiming user
      await base44.asServiceRole.entities.Listing.update(assisted.listing_id, {
        ownerUserId: claimUserId,
        owner_type: null,
        payment_status: null,
        status: 'active',
      });
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'claimed_active',
        claimed_by_user_id: claimUserId,
        claimed_at: now.toISOString(),
      });
      return Response.json({ status: 'claimed', listing, assisted });
    }

    return Response.json({ status: 'ok', listing, assisted });
  } catch (error) {
    console.error('resolveAssistedListing error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to resolve assisted listing' }, { status: 500 });
  }
});