import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { event_id } = payload;
        const event = await base44.asServiceRole.entities.NeighborhoodEvent.get(event_id);
        
        if (event.eo_user_id !== user.id) throw new Error("Not the EO of this event");
        if (event.status !== "activated") throw new Error("Event must be activated to start advertising");
        
        if (event.advertising_started_at) {
            throw new Error("Advertising already started");
        }

        const startAt = new Date(event.start_at);
        const now = new Date();
        
        if (now >= startAt) {
            throw new Error("Event already started");
        }
        
        const diffMs = startAt - now;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays > 10) throw new Error("Can only start advertising within 10 days of the start date");

        await base44.asServiceRole.entities.NeighborhoodEvent.update(event.id, {
            advertising_started_at: new Date().toISOString()
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
});