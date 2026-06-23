import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ONESIGNAL_APP_ID = "44d72407-6c94-4258-95f7-fd22c3157040";
const ALERT_PREFIXES = ["listing_", "report_", "support_", "join_", "vendor_", "event_", "payment_", "billing_", "admin_", "case_", "assign_"];

function isAlertType(type = "") {
  return ALERT_PREFIXES.some((prefix) => type.startsWith(prefix)) || ["own_expiring", "co_host_invite", "event_collaboration_invite"].includes(type);
}

async function sendOneSignal(subscriptionId, title, message, url) {
  const rawApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!rawApiKey) throw new Error('OneSignal API key is not configured.');
  const apiKey = rawApiKey.trim().replace(/^Basic\s+/i, '').replace(/^Key\s+/i, '');
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Key ${apiKey}` },
    body: JSON.stringify({ app_id: ONESIGNAL_APP_ID, include_subscription_ids: [subscriptionId], headings: { en: title }, contents: { en: message }, ...(url ? { url } : {}) })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(JSON.stringify(result.errors || result.error || result));
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const notification = payload.data || payload.notification || payload;
    const userId = notification.user_id || notification.userId;
    if (!userId || !notification.id) return Response.json({ skipped: true, reason: 'No user or notification id' });

    const type = notification.type || 'notification';
    const dedupeKey = notification.metadata?.dedupe_key || `notification_${userId}_${notification.id}`;
    const existing = await base44.asServiceRole.entities.PushNotificationDeliveryLog.filter({ dedupe_key: dedupeKey });
    if (existing.length) return Response.json({ skipped: true, reason: 'Duplicate push' });

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: userId });
    const pref = prefs[0] || { push_enabled: false, alerts_push_enabled: true };
    const categoryAllowed = type === 'nearby_listing'
      ? pref.listings_near_me_push_enabled === true
      : (type === 'vendor_near_me' || type === 'vendor_subscription')
        ? true
        : isAlertType(type) && pref.alerts_push_enabled !== false;
    if (!pref.push_enabled || !categoryAllowed) {
      await base44.asServiceRole.entities.PushNotificationDeliveryLog.create({ user_id: userId, notification_id: notification.id, notification_type: type, source_type: notification.related_entity_type, source_id: notification.related_entity_id, push_sent: false, error_message: 'Push disabled by preference', dedupe_key: dedupeKey });
      return Response.json({ skipped: true, reason: 'Push disabled' });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: userId, is_active: true, permission_status: 'enabled' });
    const subscriptionId = subscriptions[0]?.onesignal_subscription_id;
    if (!subscriptionId) return Response.json({ skipped: true, reason: 'No active push subscription' });

    await sendOneSignal(subscriptionId, String(notification.title || 'Yardit notification').slice(0, 80), String(notification.message || '').slice(0, 180), notification.metadata?.url || '');
    await base44.asServiceRole.entities.PushNotificationDeliveryLog.create({ user_id: userId, notification_id: notification.id, notification_type: type, source_type: notification.related_entity_type, source_id: notification.related_entity_id, push_sent: true, push_sent_at: new Date().toISOString(), onesignal_player_id: subscriptionId, dedupe_key: dedupeKey });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});