import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const events = await base44.asServiceRole.entities.NeighborhoodEvent.filter({ status: "pending_activation" });
        const now = new Date();

        for (const ev of events) {
            const startAt = new Date(ev.start_at);
            const diffHours = (startAt - now) / (1000 * 60 * 60);

            if (diffHours <= 48) {
                await base44.asServiceRole.entities.NeighborhoodEvent.update(ev.id, {
                    status: "downgraded"
                });

                const parts = await base44.asServiceRole.entities.EventParticipant.filter({ event_id: ev.id });
                for (const p of parts) {
                    const lst = await base44.asServiceRole.entities.Listing.get(p.listing_id);
                    if (lst && lst.ownerUserId === ev.eo_user_id) {
                        await base44.asServiceRole.entities.Listing.update(lst.id, {
                            tier: "premium"
                        });
                        break;
                    }
                }

                const pendings = await base44.asServiceRole.entities.JoinRequest.filter({ event_id: ev.id, status: "pending" });
                for (const p of pendings) {
                    await base44.asServiceRole.entities.JoinRequest.update(p.id, { status: "expired" });
                }
            }
        }
        
        const activeEvents = await base44.asServiceRole.entities.NeighborhoodEvent.filter({ status: "activated" });
        for (const ev of activeEvents) {
            const startAt = new Date(ev.start_at);
            if (now >= startAt) {
                const pendings = await base44.asServiceRole.entities.JoinRequest.filter({ event_id: ev.id, status: "pending" });
                for (const p of pendings) {
                    await base44.asServiceRole.entities.JoinRequest.update(p.id, { status: "expired" });
                }
            }
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
});