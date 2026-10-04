import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { visible } = await req.json();
    if (typeof visible !== 'boolean') return Response.json({ error: 'A visibility choice is required' }, { status: 400 });
    const rows = await base44.asServiceRole.entities.FounderMembership.filter({ user_id: user.id, active: true });
    if (!rows.length) return Response.json({ error: 'Founder membership required' }, { status: 403 });
    await Promise.all(rows.map(row => base44.asServiceRole.entities.FounderMembership.update(row.id, { badge_visible: visible })));
    return Response.json({ ok: true, visible });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}