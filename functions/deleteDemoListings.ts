import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profiles = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id });
        const adminProfile = profiles[0];
        
        if (!adminProfile || !adminProfile.is_active || adminProfile.role_label !== 'master') {
            return Response.json({ error: 'Forbidden: Master admin access required' }, { status: 403 });
        }

        const listings = await base44.asServiceRole.entities.Listing.filter({ is_demo_listing: true });
        
        let deletedCount = 0;
        for (const listing of listings) {
            // Delete join requests
            const reqs1 = await base44.asServiceRole.entities.JoinRequest.filter({ listingId: listing.id });
            const reqs2 = await base44.asServiceRole.entities.JoinRequest.filter({ saleListingId: listing.id });
            for (const r of [...reqs1, ...reqs2]) {
               await base44.asServiceRole.entities.JoinRequest.delete(r.id).catch(() => {});
            }

            // Delete reports
            const reports = await base44.asServiceRole.entities.Report.filter({ listingId: listing.id });
            for (const r of reports) {
               await base44.asServiceRole.entities.Report.delete(r.id).catch(() => {});
            }

            // Delete tracked/favorites
            const tracked = await base44.asServiceRole.entities.TrackedListing.filter({ location_id: listing.id });
            for (const t of tracked) {
               await base44.asServiceRole.entities.TrackedListing.delete(t.id).catch(() => {});
            }

            // Finally delete listing itself
            await base44.asServiceRole.entities.Listing.delete(listing.id).catch(() => {});
            deletedCount++;
        }

        return Response.json({ success: true, deletedCount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});