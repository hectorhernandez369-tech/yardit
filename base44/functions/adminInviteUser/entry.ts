import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return Response.json({ error: 'email and role are required' }, { status: 400 });
    }

    await base44.asServiceRole.users.inviteUser(email, role);

    return Response.json({ success: true });
  } catch (error) {
    console.error('adminInviteUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});