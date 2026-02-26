import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function calculateDistanceFeet(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return d * 3.28084; // convert to feet
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { action } = payload;

    if (action === "create") {
      const { title, center_lat, center_lng, start_at, end_at, eo_listing_id } = payload;
      
      // Check overlaps
      const existingEvents = await base44.entities.NeighborhoodEvent.filter({});
      for (const ev of existingEvents) {
        if (ev.status !== "downgraded" && ev.status !== "expired") {
          // Check weekend window overlap
          const evStart = new Date(ev.start_at);
          const evEnd = new Date(ev.end_at);
          const newStart = new Date(start_at);
          const newEnd = new Date(end_at);
          
          if (newStart <= evEnd && newEnd >= evStart) {
            const dist = calculateDistanceFeet(center_lat, center_lng, ev.center_lat, ev.center_lng);
            if (dist <= 1000) { // 500ft radius each = 1000ft max distance to overlap
              return Response.json({ error: 'Overlaps with existing neighborhood event for this time.' }, { status: 400 });
            }
          }
        }
      }

      // Check EO listing distance
      const eoListing = await base44.entities.Listing.get(eo_listing_id);
      if (!eoListing) return Response.json({ error: 'EO Listing not found' }, { status: 404 });

      const distFromCenter = calculateDistanceFeet(center_lat, center_lng, eoListing.lat, eoListing.lng);
      if (distFromCenter > 500) {
        return Response.json({ error: 'Your address must be inside the 500ft zone.' }, { status: 400 });
      }

      const newEvent = await base44.entities.NeighborhoodEvent.create({
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

      // Create EO participant
      await base44.entities.EventParticipant.create({
        event_id: newEvent.id,
        listing_id: eo_listing_id,
        joined_at: new Date().toISOString()
      });

      return Response.json({ success: true, event: newEvent });
    }

    if (action === "askToJoin") {
      const { event_id, listing_id } = payload;
      
      const event = await base44.entities.NeighborhoodEvent.get(event_id);
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

      const listing = await base44.entities.Listing.get(listing_id);
      if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });

      const dist = calculateDistanceFeet(event.center_lat, event.center_lng, listing.lat, listing.lng);
      if (dist > 500) {
        return Response.json({ error: 'Listing is outside the 500ft zone.' }, { status: 400 });
      }

      const existingReq = await base44.entities.JoinRequest.filter({ event_id, listing_id });
      if (existingReq.length > 0) {
        return Response.json({ error: 'Request already exists.' }, { status: 400 });
      }

      const reqRecord = await base44.entities.JoinRequest.create({
        event_id,
        listing_id,
        status: "pending"
      });

      // Notify EO
      await base44.entities.Notification.create({
        userId: event.eo_user_id,
        title: "New Join Request",
        message: `${listing.title} wants to join your neighborhood sale!`,
        read: false
      });

      return Response.json({ success: true, request: reqRecord });
    }

    if (action === "resolveJoin") {
      const { request_id, approved } = payload;
      const joinReq = await base44.entities.JoinRequest.get(request_id);
      if (!joinReq) return Response.json({ error: 'Request not found' }, { status: 404 });
      if (joinReq.status !== "pending") return Response.json({ error: 'Request already resolved' }, { status: 400 });

      const event = await base44.entities.NeighborhoodEvent.get(joinReq.event_id);
      if (event.eo_user_id !== user.id) return Response.json({ error: 'Not the organizer' }, { status: 403 });

      if (approved) {
        if (event.confirmed_count >= 25) {
          return Response.json({ error: 'Event is full (max 25)' }, { status: 400 });
        }

        await base44.entities.JoinRequest.update(request_id, {
          status: "approved",
          resolved_at: new Date().toISOString()
        });

        await base44.entities.EventParticipant.create({
          event_id: event.id,
          listing_id: joinReq.listing_id,
          joined_at: new Date().toISOString()
        });

        let newCount = event.confirmed_count + 1;
        let updates = { confirmed_count: newCount };
        
        // Activation
        if (newCount >= 5 && event.status === "pending_activation") {
          updates.status = "activated";
          updates.activated_at = new Date().toISOString();
          // "capture $49" would go here
        }

        await base44.entities.NeighborhoodEvent.update(event.id, updates);
      } else {
        await base44.entities.JoinRequest.update(request_id, {
          status: "denied",
          resolved_at: new Date().toISOString()
        });
      }

      return Response.json({ success: true });
    }

    if (action === "startAdvertising") {
      const { event_id } = payload;
      const event = await base44.entities.NeighborhoodEvent.get(event_id);
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
      if (event.eo_user_id !== user.id) return Response.json({ error: 'Not the organizer' }, { status: 403 });
      
      if (event.status !== "activated") {
        return Response.json({ error: 'Event must be activated first' }, { status: 400 });
      }

      const now = new Date();
      const startAt = new Date(event.start_at);
      const diffDays = (startAt - now) / (1000 * 60 * 60 * 24);

      if (diffDays > 10 || diffDays < 0) {
        return Response.json({ error: 'Can only start advertising within 10 days of start date.' }, { status: 400 });
      }

      await base44.entities.NeighborhoodEvent.update(event_id, {
        advertising_started_at: new Date().toISOString()
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});