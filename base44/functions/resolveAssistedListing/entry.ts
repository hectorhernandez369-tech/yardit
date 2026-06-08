import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // --- Actions (checked FIRST before any early returns) ---

    // Logged-in user claims ownership — must run before status early-returns
    if (action === 'claim_complete') {
      if (!claimUserId) {
        console.error('claim_complete called without claimUserId');
        return Response.json({ error: 'claimUserId is required', status: 'error' }, { status: 400 });
      }
      // Only allow claim when status is assisted_active_unclaimed (after seller approval)
      if (assisted.assisted_status !== 'assisted_active_unclaimed') {
        console.error('claim_complete: invalid assisted_status for claim:', assisted.assisted_status);
        return Response.json({ error: `Cannot claim listing in status: ${assisted.assisted_status}. Seller must approve first.`, status: 'error' }, { status: 400 });
      }
      const claimNow = new Date().toISOString();

      // Claim only attaches ownership and unlocks management tools — do NOT change dates
      await base44.asServiceRole.entities.Listing.update(assisted.listing_id, {
        ownerUserId: claimUserId,
        owner_type: 'user',
      });
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'claimed_active',
        claimed_by_user_id: claimUserId,
        claimed_at: claimNow,
      });
      const updatedListings = await base44.asServiceRole.entities.Listing.filter({ id: assisted.listing_id });
      const updatedListing = updatedListings[0] || listing;
      console.log('claim_complete: success for user', claimUserId, 'listing', assisted.listing_id);
      return Response.json({ status: 'claimed', listing: updatedListing, assisted });
    }

    // Handle completed states — return them directly without checking expiry
    if (assisted.assisted_status === 'assisted_declined') {
      return Response.json({ status: 'declined', listing, assisted });
    }
    // approved/active — already visible, QR rescan shows owner view
    if (assisted.assisted_status === 'assisted_active_unclaimed') {
      return Response.json({ status: 'approved', listing, assisted });
    }
    if (assisted.assisted_status === 'claimed_active') {
      return Response.json({ status: 'claimed', listing, assisted });
    }

    // Check expiry for pending listings
    if (isExpired && assisted.assisted_status === 'pending_seller_approval') {
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'assisted_expired',
      });
      return Response.json({ status: 'expired', listing: null, assisted });
    }

    // No action — just return the current state for display
    if (!action) {
      return Response.json({ status: 'ok', listing, assisted });
    }

    // Seller approves: listing goes public. If claimUserId is provided, also claim immediately.
    if (action === 'approve') {
      const claimNow = now.toISOString();
      const isClaiming = !!claimUserId;

      await base44.asServiceRole.entities.Listing.update(assisted.listing_id, {
        status: 'active',
        ...(isClaiming ? { ownerUserId: claimUserId, owner_type: 'user' } : {}),
      });

      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: isClaiming ? 'claimed_active' : 'assisted_active_unclaimed',
        seller_approved_at: claimNow,
        ...(isClaiming ? { claimed_by_user_id: claimUserId, claimed_at: claimNow } : {}),
      });

      const updatedListings = await base44.asServiceRole.entities.Listing.filter({ id: assisted.listing_id });
      const updatedListing = updatedListings[0] || listing;
      const returnStatus = isClaiming ? 'claimed' : 'approved';
      console.log(`approve: listing ${assisted.listing_id} → ${returnStatus}`, isClaiming ? `claimed by ${claimUserId}` : 'unclaimed');
      return Response.json({ status: returnStatus, listing: updatedListing, assisted });
    }

    if (action === 'decline') {
      await base44.asServiceRole.entities.AssistedListing.update(assisted.id, {
        assisted_status: 'assisted_declined',
        seller_declined_at: now.toISOString(),
        assisted_qr_token: '__invalidated__',
      });
      await base44.asServiceRole.entities.Listing.update(assisted.listing_id, {
        status: 'hidden',
      });
      return Response.json({ status: 'declined', listing: null, assisted });
    }

    return Response.json({ status: 'ok', listing, assisted });
  } catch (error) {
    console.error('resolveAssistedListing error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to resolve assisted listing' }, { status: 500 });
  }
});