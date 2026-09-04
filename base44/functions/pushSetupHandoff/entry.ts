import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const DEFAULT_PREFS = {
  push_enabled: true,
  alerts_push_enabled: true,
  account_alerts_push_enabled: true,
  billing_alerts_push_enabled: true,
  approval_alerts_push_enabled: true,
  safety_alerts_push_enabled: true,
  support_alerts_push_enabled: true,
  policy_alerts_push_enabled: true,
  listings_near_me_push_enabled: false,
  listings_near_me_radius_miles: 2,
  vendor_near_me_push_enabled: false,
  vendor_near_me_radius_miles: 2,
  marketing_push_enabled: false,
};

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function findValidHandoff(base44, token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 200) return null;
  const tokenHash = await hashToken(token);
  const handoffs = await base44.asServiceRole.entities.PushSetupHandoff.filter({ token_hash: tokenHash, purpose: 'push_setup' });
  const handoff = handoffs[0];
  if (!handoff || handoff.used_at || new Date(handoff.expires_at).getTime() <= Date.now()) return null;
  return handoff;
}

async function saveSubscription(base44, handoff, subscriptionId, userAgent) {
  const now = new Date().toISOString();
  const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: handoff.user_id });
  const subscriptionData = { user_id: handoff.user_id, onesignal_subscription_id: subscriptionId, permission_status: 'enabled', is_active: true, user_agent: userAgent || '', updated_at: now };
  if (subscriptions[0]) await base44.asServiceRole.entities.PushSubscription.update(subscriptions[0].id, subscriptionData);
  else await base44.asServiceRole.entities.PushSubscription.create({ ...subscriptionData, created_at: now });

  const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: handoff.user_id });
  const storedPreferences = preferences[0] || {};
  const preferenceData = Object.fromEntries(Object.keys(DEFAULT_PREFS).map((key) => [key, storedPreferences[key] ?? DEFAULT_PREFS[key]]));
  preferenceData.user_id = handoff.user_id;
  preferenceData.push_enabled = true;
  preferenceData.last_updated_at = now;
  if (preferences[0]) await base44.asServiceRole.entities.NotificationPreference.update(preferences[0].id, preferenceData);
  else await base44.asServiceRole.entities.NotificationPreference.create(preferenceData);

  await base44.asServiceRole.entities.PushSetupHandoff.update(handoff.id, { used_at: now });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    if (body.action === 'create') {
      const user = await base44.auth.me();
      if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const token = createToken();
      const now = new Date();
      await base44.asServiceRole.entities.PushSetupHandoff.create({
        token_hash: await hashToken(token),
        user_id: user.id,
        purpose: 'push_setup',
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      });
      return Response.json({ token, expiresInSeconds: 600 });
    }

    const handoff = await findValidHandoff(base44, body.token);
    if (!handoff) return Response.json({ valid: false }, { status: 400 });
    if (body.action === 'validate') return Response.json({ valid: true });

    if (body.action === 'complete') {
      const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
      if (!subscriptionId || subscriptionId.length > 300) return Response.json({ error: 'Invalid subscription' }, { status: 400 });
      await saveSubscription(base44, handoff, subscriptionId, typeof body.userAgent === 'string' ? body.userAgent.slice(0, 1000) : '');
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}