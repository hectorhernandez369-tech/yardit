import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Forbidden: Not authenticated' }, { status: 403 });
    }

    // Authorization is managed by our custom AdminProfile system, not Base44 roles.
    // Verify the caller has an active AdminProfile before allowing invites.
    const profiles = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id });
    const callerProfile = profiles.find(p => p.is_active === true);
    if (!callerProfile) {
      return Response.json({ error: 'Forbidden: No active admin profile' }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return Response.json({ error: 'email and role are required' }, { status: 400 });
    }

    // Always invite as "user" — Base44 restricts non-default roles to admin callers.
    // Internal role elevation is handled by AdminInviteProfile + syncAdminInvite on login.
    await base44.auth.inviteUser(email, "user");

    return Response.json({ success: true });
  } catch (error) {
    console.error('adminInviteUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});