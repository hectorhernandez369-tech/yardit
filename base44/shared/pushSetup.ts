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

export function createPushSetupToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashPushSetupToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function findValidPushSetupHandoff(base44, token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 200) return null;
  const tokenHash = await hashPushSetupToken(token);
  const handoffs = await base44.asServiceRole.entities.PushSetupHandoff.filter({ token_hash: tokenHash, purpose: 'push_setup' });
  const handoff = handoffs[0];
  if (!handoff || handoff.used_at || new Date(handoff.expires_at).getTime() <= Date.now()) return null;
  return handoff;
}

export async function savePushSubscriptionForUser(base44, userId, subscriptionId, userAgent) {
  const now = new Date().toISOString();
  const [userSubscriptions, matchingSubscriptions] = await Promise.all([
    base44.asServiceRole.entities.PushSubscription.filter({ user_id: userId }),
    base44.asServiceRole.entities.PushSubscription.filter({ onesignal_subscription_id: subscriptionId }),
  ]);
  const target = matchingSubscriptions.find((item) => item.user_id === userId) || userSubscriptions[0] || matchingSubscriptions[0];
  const subscriptionData = {
    user_id: userId,
    onesignal_subscription_id: subscriptionId,
    permission_status: 'enabled',
    is_active: true,
    user_agent: userAgent || '',
    updated_at: now,
  };

  let targetId;
  if (target) {
    await base44.asServiceRole.entities.PushSubscription.update(target.id, subscriptionData);
    targetId = target.id;
  } else {
    const created = await base44.asServiceRole.entities.PushSubscription.create({ ...subscriptionData, created_at: now });
    targetId = created.id;
  }

  const duplicates = [...userSubscriptions, ...matchingSubscriptions].filter((item, index, all) =>
    item.id !== targetId && all.findIndex((candidate) => candidate.id === item.id) === index && item.is_active !== false
  );
  await Promise.all(duplicates.map((item) => base44.asServiceRole.entities.PushSubscription.update(item.id, { is_active: false, updated_at: now })));

  const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: userId });
  const stored = preferences[0] || {};
  const preferenceData = Object.fromEntries(Object.keys(DEFAULT_PREFS).map((key) => [key, stored[key] ?? DEFAULT_PREFS[key]]));
  preferenceData.user_id = userId;
  preferenceData.push_enabled = true;
  preferenceData.last_updated_at = now;
  if (preferences[0]) await base44.asServiceRole.entities.NotificationPreference.update(preferences[0].id, preferenceData);
  else await base44.asServiceRole.entities.NotificationPreference.create(preferenceData);

  return { subscriptionId: targetId };
}