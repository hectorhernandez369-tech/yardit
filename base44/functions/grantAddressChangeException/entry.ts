import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const nowIso = () => new Date().toISOString();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me();
    if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [byUserId, byEmail] = await Promise.all([
      base44.asServiceRole.entities.AdminProfile.filter({ user_id: actor.id }).catch(() => []),
      actor.email ? base44.asServiceRole.entities.AdminProfile.filter({ email: String(actor.email).toLowerCase() }).catch(() => []) : [],
    ]);
    const adminProfile = byUserId?.[0] || byEmail?.[0];
    if (!adminProfile || adminProfile.is_active !== true) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id || '').trim();
    if (!userId) return Response.json({ error: 'Missing user_id' }, { status: 400 });

    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const target = users?.[0];
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const existingData = target?.data && typeof target.data === 'object' ? target.data : {};

    await base44.asServiceRole.entities.User.update(userId, {
      address_change_override_until: expiresAt,
      data: {
        ...existingData,
        address_change_override_until: expiresAt,
      },
    });

    await base44.asServiceRole.entities.UserActivityLog.create({
      user_id: userId,
      event_type: 'address_change_exception_granted',
      event_label: 'Address Change Exception Granted',
      target_type: 'account',
      target_id: userId,
      source_page: 'Admin',
      created_at: nowIso(),
      details_json: {
        granted_by_admin_id: actor.id,
        granted_by_admin_email: actor.email || '',
        expires_at: expiresAt,
      },
    }).catch(() => null);

    return Response.json({ ok: true, expires_at: expiresAt });
  } catch (error) {
    console.error('grantAddressChangeException failed', error?.message || error);
    return Response.json({ error: error?.message || 'Could not grant address change exception.' }, { status: 500 });
  }
});
