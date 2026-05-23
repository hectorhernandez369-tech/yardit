import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this repair
    if (!user || (user.role !== 'admin' && user.role !== 'master' && user.role !== 'super_master')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find all AssistedListing records with claimed_active status
    const assistedListings = await base44.asServiceRole.entities.AssistedListing.filter({
      assisted_status: 'claimed_active',
    });

    let repairedCount = 0;
    let errors = [];

    for (const assisted of assistedListings) {
      try {
        // Fetch the associated Listing
        const listings = await base44.asServiceRole.entities.Listing.filter({ id: assisted.listing_id });
        const listing = listings[0];
        if (!listing) {
          errors.push(`Listing ${assisted.listing_id} not found`);
          continue;
        }

        // Check if datetimes need repair (missing seconds/timezone or invalid)
        const startRaw = listing.startDateTime;
        const endRaw = listing.endDateTime;

        const parsedStart = startRaw ? new Date(startRaw) : null;
        const parsedEnd = endRaw ? new Date(endRaw) : null;

        const needsStartRepair = !startRaw || !parsedStart || isNaN(parsedStart.getTime()) || !startRaw.includes('Z');
        const needsEndRepair = !endRaw || !parsedEnd || isNaN(parsedEnd.getTime()) || !endRaw.includes('Z');

        if (needsStartRepair || needsEndRepair) {
          const now = new Date();
          const normalizedStart = needsStartRepair ? now.toISOString() : parsedStart.toISOString();
          
          // If end is invalid or in the past, set to 7 days from now
          const fallbackEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const normalizedEnd = needsEndRepair || (parsedEnd && parsedEnd < now) ? fallbackEnd : parsedEnd.toISOString();

          await base44.asServiceRole.entities.Listing.update(assisted.listing_id, {
            startDateTime: normalizedStart,
            endDateTime: normalizedEnd,
          });

          repairedCount++;
          console.log(`Repaired listing ${assisted.listing_id}: start=${normalizedStart}, end=${normalizedEnd}`);
        }
      } catch (err) {
        errors.push(`Error repairing ${assisted.listing_id}: ${err.message}`);
      }
    }

    return Response.json({
      repairedCount,
      totalFound: assistedListings.length,
      errors,
    });
  } catch (error) {
    console.error('repairClaimedAssistedListings error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to repair claimed assisted listings' }, { status: 500 });
  }
});