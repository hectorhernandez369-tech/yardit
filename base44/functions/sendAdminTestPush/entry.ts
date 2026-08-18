import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const title = 'Yardit Test';
    const content = 'Hello from Yardit! This is a test push notification.';

    const admins = await base44.asServiceRole.entities.AdminProfile.list('-created_date', 100);
    const active = (admins || []).filter(a => a.is_active === true && a.user_id);
    const userIds = [...new Set(
      active.map(a => (typeof a.user_id === 'object' ? a.user_id.id : a.user_id)).filter(Boolean)
    )];

    const results = [];
    for (const uid of userIds) {
      try {
        await base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: uid,
          title,
          content
        });
        results.push({ user_id: uid, status: 'sent' });
      } catch (e) {
        results.push({ user_id: uid, status: 'error', error: e.message });
      }
    }

    return Response.json({ recipients: userIds.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}