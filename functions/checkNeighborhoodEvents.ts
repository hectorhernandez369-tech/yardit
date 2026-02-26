import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Use service role for scheduled task
    const events = await base44.asServiceRole.entities.NeighborhoodEvent.filter({});
    const now = new Date();

    for (const ev of events) {
      if (ev.status === "expired") continue;

      const startAt = new Date(ev.start_at);
      const endAt = new Date(ev.end_at);
      const hoursToStart = (startAt - now) / (1000 * 60 * 60);

      // 48 hour activation deadline check
      if (ev.status === "pending_activation" && hoursToStart <= 48) {
        // Downgrade event
        await base44.asServiceRole.entities.NeighborhoodEvent.update(ev.id, {
          status: "downgraded"
        });

        // Convert EO's listing to Premium
        const participants = await base44.asServiceRole.entities.EventParticipant.filter({ event_id: ev.id });
        if (participants.length > 0) {
          // EO is usually the first participant or we can match listing owner to EO
          for (const p of participants) {
            const listing = await base44.asServiceRole.entities.Listing.get(p.listing_id);
            if (listing && listing.ownerUserId === ev.eo_user_id) {
              await base44.asServiceRole.entities.Listing.update(listing.id, { tier: "premium" });
            }
          }
        }
        
        // Auto-expire pending requests
        const requests = await base44.asServiceRole.entities.JoinRequest.filter({ event_id: ev.id, status: "pending" });
        for (const r of requests) {
          await base44.asServiceRole.entities.JoinRequest.update(r.id, { status: "expired" });
        }
      }

      // Expire event after end_at
      if (now > endAt && ev.status !== "expired") {
        await base44.asServiceRole.entities.NeighborhoodEvent.update(ev.id, { status: "expired" });
        
        // Auto-expire pending requests
        const requests = await base44.asServiceRole.entities.JoinRequest.filter({ event_id: ev.id, status: "pending" });
        for (const r of requests) {
          await base44.asServiceRole.entities.JoinRequest.update(r.id, { status: "expired" });
        }
      }

      // Auto-expire pending requests if event starts
      if (now >= startAt && ev.status !== "expired") {
         const requests = await base44.asServiceRole.entities.JoinRequest.filter({ event_id: ev.id, status: "pending" });
         for (const r of requests) {
           await base44.asServiceRole.entities.JoinRequest.update(r.id, { status: "expired" });
         }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});