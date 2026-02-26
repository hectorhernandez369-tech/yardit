import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { request_id, action } = payload;
        
        const joinReq = await base44.asServiceRole.entities.JoinRequest.get(request_id);
        if (!joinReq) throw new Error("Request not found");

        const event = await base44.asServiceRole.entities.NeighborhoodEvent.get(joinReq.event_id);
        if (event.eo_user_id !== user.id) throw new Error("Not the EO of this event");

        if (joinReq.status !== "pending") throw new Error("Request is not pending");

        if (action === 'approve') {
            if (event.confirmed_count >= 25) throw new Error("Event is full (max 25)");

            await base44.asServiceRole.entities.JoinRequest.update(request_id, { status: "approved", resolved_at: new Date().toISOString() });
            
            await base44.asServiceRole.entities.EventParticipant.create({
                event_id: event.id,
                listing_id: joinReq.listing_id,
                joined_at: new Date().toISOString()
            });

            // Notify homeowner
            const listing = await base44.asServiceRole.entities.Listing.get(joinReq.listing_id);
            if (listing) {
                await base44.asServiceRole.entities.Notification.create({
                    userId: listing.ownerUserId,
                    title: "Joined Neighborhood Sale",
                    message: `Approved — you joined ${event.title}.`
                });
            }

            const newCount = event.confirmed_count + 1;
            let status = event.status;
            let activated_at = event.activated_at;

            if (newCount === 5 && status === "pending_activation") {
                status = "activated";
                activated_at = new Date().toISOString();
                
                // Capture $49 payment
                const payments = await base44.asServiceRole.entities.Payment.filter({ transaction_id: "auth_" + event.id });
                if (payments.length > 0) {
                    await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: "completed" });
                }
            }

            await base44.asServiceRole.entities.NeighborhoodEvent.update(event.id, {
                confirmed_count: newCount,
                status,
                activated_at
            });

            if (newCount >= 25) {
                const pendings = await base44.asServiceRole.entities.JoinRequest.filter({ event_id: event.id, status: "pending" });
                for (const p of pendings) {
                    await base44.asServiceRole.entities.JoinRequest.update(p.id, { status: "expired" });
                    
                    const pListing = await base44.asServiceRole.entities.Listing.get(p.listing_id);
                    if (pListing) {
                        await base44.asServiceRole.entities.Notification.create({
                            userId: pListing.ownerUserId,
                            title: "Event Full",
                            message: `Event is full — request expired for ${event.title}.`
                        });
                    }
                }
            }

        } else if (action === 'deny') {
            await base44.asServiceRole.entities.JoinRequest.update(request_id, { status: "denied", resolved_at: new Date().toISOString() });
            
            const listing = await base44.asServiceRole.entities.Listing.get(joinReq.listing_id);
            if (listing) {
                await base44.asServiceRole.entities.Notification.create({
                    userId: listing.ownerUserId,
                    title: "Request Denied",
                    message: `Denied — not added to ${event.title}.`
                });
            }
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
});