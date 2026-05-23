import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Fetch all listings (service role — no auth needed for scheduled task)
    let listings = [];
    try {
      listings = await base44.asServiceRole.entities.Listing.list('-created_date', 500);
    } catch (e) {
      console.error("Error fetching listings", e);
      return Response.json({ error: e.message }, { status: 500 });
    }

    console.log(`[syncListingStatuses] Processing ${listings.length} listings at ${now.toISOString()}`);

    const updates = [];
    const skipped = [];

    for (const listing of listings) {
      const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
      const end = listing?.endDateTime ? new Date(listing.endDateTime) : null;
      const currentStatus = listing?.status;

      // Skip neighborhood_sale — handled by checkNeighborhoodEvents
      if (listing.listingType === 'neighborhood_sale') {
        skipped.push({ id: listing.id, reason: 'neighborhood_sale' });
        continue;
      }

      // Skip terminal/manual statuses
      if (['canceled', 'cancelled', 'closed', 'completed', 'suspended', 'under_review', 'hidden'].includes(currentStatus)) {
        skipped.push({ id: listing.id, reason: `terminal_status:${currentStatus}` });
        continue;
      }

      // Must have valid dates to evaluate
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        skipped.push({ id: listing.id, reason: 'invalid_dates' });
        continue;
      }

      let nextStatus = currentStatus;

      if (now < start) {
        nextStatus = 'scheduled';
      } else if (now >= start && now <= end) {
        nextStatus = 'active';
      } else if (now > end) {
        nextStatus = 'expired';
      }

      if (nextStatus !== currentStatus) {
        try {
          // Use patch-style update to avoid validation errors on old listings missing required fields
          await base44.asServiceRole.entities.Listing.update(listing.id, {
            status: nextStatus,
            // Supply fallback values for required fields that old/legacy listings may be missing
            category: listing.category || 'Miscellaneous',
            timeZoneId: listing.timeZoneId || 'America/Los_Angeles',
          });
          updates.push({ id: listing.id, listingNumber: listing.listingNumber, old: currentStatus, new: nextStatus });
          console.log(`[syncListingStatuses] Updated ${listing.listingNumber || listing.id}: ${currentStatus} → ${nextStatus}`);
        } catch (e) {
          console.error(`[syncListingStatuses] Failed to update ${listing.id}:`, e.message);
        }
      }
    }

    console.log(`[syncListingStatuses] Done. Updated: ${updates.length}, Skipped: ${skipped.length}`);
    return Response.json({ success: true, updated_count: updates.length, updates, skipped_count: skipped.length });
  } catch (error) {
    console.error('[syncListingStatuses] Fatal error:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});