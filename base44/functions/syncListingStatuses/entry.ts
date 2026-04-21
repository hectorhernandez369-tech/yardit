import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Fetch all listings to check statuses
    // Fetching large sets of records at once may be a problem down the line if there are > 50,000,
    // but works for standard periodic checking.
    let listings = [];
    try {
      listings = await base44.asServiceRole.entities.Listing.list();
    } catch (e) {
      console.error("Error fetching listings", e);
      return Response.json({ error: e.message }, { status: 500 });
    }
    
    const now = new Date();
    const updates = [];

    for (const listing of listings) {
      const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
      const end = listing?.endDateTime ? new Date(listing.endDateTime) : null;
      const currentStatus = listing?.status;
      let nextStatus = currentStatus;

      // Ensure valid dates exist before evaluating
      if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        
        // 1. Canceled takes highest precedence (sticky status)
        // If it's explicitly canceled, we don't revert it back to active/scheduled/expired.
        if (currentStatus === "canceled" || currentStatus === "cancelled" || listing?.event_state === "canceled") {
          nextStatus = "canceled";
        }
        // 2. Closed/Completed/Suspended/Draft are also typically terminal or manual states we shouldn't blindly overwrite
        else if (["closed", "completed", "suspended", "draft", "under_review"].includes(currentStatus)) {
           nextStatus = currentStatus;
        }
        // 3. Date-based logic for active/scheduled/expired/upcoming
        else {
          if (now < start) {
            nextStatus = "scheduled"; // Using 'scheduled' to represent 'Coming Soon' state internally, or we can use 'upcoming'
            // The frontend map state typically translates 'scheduled' / 'upcoming' to 'Coming Soon'.
            // Let's use 'scheduled' to align with paid residential creation logic, or 'upcoming' if we prefer.
            // Let's stick to "scheduled" as it's already in the Listing schema enum.
          } else if (now >= start && now <= end) {
            nextStatus = "active";
          } else if (now > end) {
            nextStatus = "expired";
          }
        }
      }

      // If the status has changed, update it.
      // Exception: If it's a neighborhood sale that is pending activation/collecting participants, 
      // we might not want to force it to "scheduled" or "active" until payment is complete.
      // The `checkNeighborhoodEvents` function already handles Neighborhood Sales intricately, 
      // so we should probably exclude `neighborhood_sale` from this sweeping basic date logic 
      // OR only apply it if it's not pending payment.
      
      // Let's exclude neighborhood_sale from this basic date-based status override 
      // because checkNeighborhoodEvents handles them specifically based on homes count and payment lock.
      if (listing.listingType !== "neighborhood_sale" && nextStatus !== currentStatus && nextStatus) {
        await base44.asServiceRole.entities.Listing.update(listing.id, {
          status: nextStatus
        });
        updates.push({ id: listing.id, old_status: currentStatus, new_status: nextStatus });
      }
    }

    return Response.json({ success: true, updated_count: updates.length, updates });
  } catch (error) {
    console.error('syncListingStatuses failed:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});