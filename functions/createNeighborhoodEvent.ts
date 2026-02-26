import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { title, center_lat, center_lng, start_at, end_at, eo_listing_id } = payload;
        
        const eoListing = await base44.asServiceRole.entities.Listing.get(eo_listing_id);
        if (!eoListing) throw new Error("EO listing not found.");
        
        const distMeters = calculateDistanceMeters(center_lat, center_lng, eoListing.lat, eoListing.lng);
        if (distMeters > 152.4) {
            throw new Error("EO address must be within 500ft of the event center.");
        }

        const existingEvents = await base44.asServiceRole.entities.NeighborhoodEvent.filter({});
        const eventStart = new Date(start_at);
        const eventEnd = new Date(end_at);

        for (const ev of existingEvents) {
            const evStart = new Date(ev.start_at);
            const evEnd = new Date(ev.end_at);
            
            if (eventStart < evEnd && eventEnd > evStart) {
                const dist = calculateDistanceMeters(center_lat, center_lng, ev.center_lat, ev.center_lng);
                if (dist < 304.8) {
                    throw new Error("Event overlaps with another Neighborhood Event for the same window.");
                }
            }
        }

        const newEvent = await base44.asServiceRole.entities.NeighborhoodEvent.create({
            eo_user_id: user.id,
            title,
            center_lat,
            center_lng,
            radius_feet: 500,
            start_at,
            end_at,
            status: "pending_activation",
            confirmed_count: 1
        });

        await base44.asServiceRole.entities.EventParticipant.create({
            event_id: newEvent.id,
            listing_id: eo_listing_id,
            joined_at: new Date().toISOString()
        });

        await base44.asServiceRole.entities.Payment.create({
            location_id: eo_listing_id,
            amount: 49,
            plan: "5_day",
            duration_days: 2,
            status: "pending",
            payment_method: "neighborhood_event",
            transaction_id: "auth_" + newEvent.id
        });

        return Response.json({ success: true, event: newEvent });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
});