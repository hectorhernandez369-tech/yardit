import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { createPushSetupToken, findValidPushSetupHandoff, hashPushSetupToken } from '../../shared/pushSetup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    if (body.action === 'create') {
      const user = await base44.auth.me();
      if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const token = createPushSetupToken();
      const now = new Date();
      await base44.asServiceRole.entities.PushSetupHandoff.create({
        token_hash: await hashPushSetupToken(token),
        user_id: user.id,
        purpose: 'push_setup',
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      });
      return Response.json({ token, expiresInSeconds: 600 });
    }

    if (body.action === 'validate') {
      const handoff = await findValidPushSetupHandoff(base44, body.token);
      return handoff
        ? Response.json({ valid: true })
        : Response.json({ valid: false }, { status: 400 });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}