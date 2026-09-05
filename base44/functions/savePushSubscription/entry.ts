import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { findValidPushSetupHandoff, savePushSubscriptionForUser } from '../../shared/pushSetup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const oneSignalSubscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
    if (!oneSignalSubscriptionId || oneSignalSubscriptionId.length > 300) {
      return Response.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    let userId = '';
    let handoff = null;
    if (body.token) {
      handoff = await findValidPushSetupHandoff(base44, body.token);
      if (!handoff) return Response.json({ error: 'Invalid or expired setup link' }, { status: 400 });
      userId = handoff.user_id;
    } else {
      const user = await base44.auth.me();
      if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      userId = user.id;
    }

    await savePushSubscriptionForUser(
      base44,
      userId,
      oneSignalSubscriptionId,
      typeof body.userAgent === 'string' ? body.userAgent.slice(0, 1000) : ''
    );
    if (handoff) {
      await base44.asServiceRole.entities.PushSetupHandoff.update(handoff.id, { used_at: new Date().toISOString() });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}