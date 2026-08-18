import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const title = 'Yardit Test';
    const content = 'Hello from Yardit! This is a test push notification.';

    try {
      await base44.asServiceRole.integrations.Core.SendPushNotification({
        user_id: user.id,
        title,
        content
      });
      return Response.json({ sent: true, user_id: user.id });
    } catch (e) {
      return Response.json({ sent: false, user_id: user.id, error: e.message }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}