import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try {
      if (req.body && typeof req.body === 'object') body = req.body;
      else body = await req.clone().json();
    } catch (_) {}
    const title = 'Yardit Test';
    const content = 'Hello from Yardit! This is a test push notification.';
    const target = (body && body.target) || 'me';

    if (target === 'all') {
      const admins = await base44.asServiceRole.entities.AdminProfile.list('-created_date', 100);
      const userIds = [...new Set(
        (admins || [])
          .filter(a => a.is_active === true && a.user_id)
          .map(a => (typeof a.user_id === 'object' ? a.user_id.id : a.user_id))
          .filter(Boolean)
      )];
      const results = [];
      for (const uid of userIds) {
        try {
          const delivery = await base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: uid,
            title,
            content,
          });
          results.push({ user_id: uid, status: 'sent', delivery });
        } catch (e) {
          results.push({ user_id: uid, status: 'error', error: e.message });
        }
      }
      return Response.json({ target: 'all', recipients: userIds.length, results });
    }

    try {
      const delivery = await base44.asServiceRole.integrations.Core.SendPushNotification({
        user_id: user.id,
        title,
        content,
      });
      return Response.json({ sent: true, user_id: user.id, delivery });
    } catch (e) {
      return Response.json({ sent: false, user_id: user.id, error: e.message }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}