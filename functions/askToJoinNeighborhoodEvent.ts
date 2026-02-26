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

        const { event_id, listing_id } = payload;
        
        const event = await base44.asServiceRole.entities.NeighborhoodEvent.get(event_id);
        const listing = await base44.asServiceRole.entities.Listing.get(listing_id);
        
        if (!event || !listing) throw new Error("Event or Listing not found");

        if (event.status === "downgraded" || event.status === "expired") {
            throw new Error("This event is no longer active.");
        }

        if (new Date() >= new Date(event.start_at)) {
            throw new Error("Cannot join an event that has already started.");
        }

        if (event.confirmed_count >= 25) {
            throw new Error("This event is full (maximum 25 participants).");
        }

        const distMeters = calculateDistanceMeters(event.center_lat, event.center_lng, listing.lat, listing.lng);
        if (distMeters > 152.4) {
            throw new Error("Listing is not within 500ft of the event.");
        }

        const existingReqs = await base44.asServiceRole.entities.JoinRequest.filter({ event_id, listing_id });
        if (existingReqs.some(req => req.status === "pending" || req.status === "approved")) {
            throw new Error("Already requested or approved to join this event.");
        }

        const reqEntity = await base44.asServiceRole.entities.JoinRequest.create({
            event_id,
            listing_id,
            status: "pending"
        });

        await base44.asServiceRole.entities.Notification.create({
            userId: event.eo_user_id,
            title: "New Join Request",
            message: `${listing.title} wants to join your neighborhood sale ${event.title}. Accept or Deny.`
        });

        await base44.asServiceRole.entities.Notification.create({
            userId: listing.ownerUserId,
            title: "Request Sent",
            message: `Request sent to join ${event.title} — pending approval.`
        });

        return Response.json({ success: true, request: reqEntity });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
});