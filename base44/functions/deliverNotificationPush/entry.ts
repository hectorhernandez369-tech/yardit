import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ONESIGNAL_APP_ID = "44d72407-6c94-4258-95f7-fd22c3157040";
const PUSH_TYPES = new Set([
  'nearby_listings_daily_digest',
  'listing_open',
  'saved_listing_active',
  'listing_removed',
  'join_request',
  'join_request_accepted',
  'join_request_denied',
  'co_host_invite',
  'neighborhood_sale_warning_48h',
  'neighborhood_sale_payment_retry_scheduled',
  'neighborhood_sale_payment_failed_cancelled',
  'vendor_event',
  'vendor_event_invite',
  'event_collaboration_invite',
  'vendor_access_invite',
  'vendor_checkin',
  'vendor_subscription',
  'reserve_deposit',
  'payment_webhook_failure',
]);
const ADMIN_INBOX_TYPES = new Set(['admin', 'admin_note', 'admin_report', 'admin_case', 'admin_billing', 'admin_vendor_account_auto_created', 'billing_cycles']);
const DEPRECATED_PUSH_TYPES = new Set(['fallback_listing', 'vendor', 'nearby_listing', 'vendor_near_me']);

function deliveryMethodsFor(notification, type) {
  if (Array.isArray(notification.delivery_methods) && notification.delivery_methods.length) return notification.delivery_methods;
  if (ADMIN_INBOX_TYPES.has(type)) return ['admin_inbox'];
  if (PUSH_TYPES.has(type)) return ['push', 'bell'];
  return ['bell'];
}

function withBell(methods) {
  return methods.includes('bell') ? methods : [...methods, 'bell'];
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

async function ensureBellHistory(base44, notification, userId, type, methods, dedupeKey) {
  const deliveryMethods = withBell(methods);
  const existingByDedupe = await base44.asServiceRole.entities.Notification.filter({ dedupe_key: dedupeKey });
  const existingById = notification.id ? await base44.asServiceRole.entities.Notification.filter({ id: notification.id }) : [];
  const existing = existingByDedupe[0] || existingById[0];

  if (existing) {
    const currentMethods = Array.isArray(existing.delivery_methods) ? existing.delivery_methods : [];
    if (!currentMethods.includes('bell')) {
      await base44.asServiceRole.entities.Notification.update(existing.id, { delivery_methods: withBell(currentMethods.length ? currentMethods : deliveryMethods) });
    }
    return existing.id;
  }

  const created = await base44.asServiceRole.entities.Notification.create(compactRecord({
    userId,
    user_id: userId,
    title: String(notification.title || 'Yardit notification').slice(0, 120),
    message: String(notification.message || '').slice(0, 500),
    read: false,
    is_read: false,
    type,
    related_entity_type: notification.related_entity_type,
    related_entity_id: notification.related_entity_id,
    metadata: notification.metadata || {},
    recipient: notification.recipient,
    trigger: notification.trigger,
    delivery_methods: deliveryMethods,
    deep_link: notification.deep_link || notification.metadata?.url,
    dedupe_key: dedupeKey,
    registry_status: notification.registry_status,
    registry_version: notification.registry_version,
  }));
  return created.id;
}

function getPreferenceField(type = '') {
  const normalized = String(type).toLowerCase();
  if (normalized === 'nearby_listings_daily_digest') return 'listings_near_me_push_enabled';
  if (normalized === 'vendor_checkin' || normalized === 'vendor_subscription') return 'vendor_near_me_push_enabled';
  if (normalized.includes('billing') || normalized.includes('payment') || normalized === 'reserve_deposit') return 'billing_alerts_push_enabled';
  if (normalized.startsWith('support_') || normalized.startsWith('case_')) return 'support_alerts_push_enabled';
  if (normalized.startsWith('report_') || normalized.includes('safety') || normalized.includes('fraud')) return 'safety_alerts_push_enabled';
  if (normalized.startsWith('join_') || normalized.includes('invite') || normalized.includes('approval') || normalized.startsWith('vendor_event')) return 'approval_alerts_push_enabled';
  if (normalized.includes('policy') || normalized.includes('terms')) return 'policy_alerts_push_enabled';
  return 'account_alerts_push_enabled';
}

function isPushAllowedByPreferences(type, pref) {
  if (type === 'nearby_listings_daily_digest') return pref.listings_near_me_push_enabled === true;
  if (type === 'vendor_subscription') return true;
  if (type === 'vendor_checkin') return pref.vendor_near_me_push_enabled === true;
  if (pref.alerts_push_enabled === false) return false;
  return pref[getPreferenceField(type)] !== false;
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
    if (!userId) return Response.json({ skipped: true, reason: 'No user id' });

    const type = notification.type || 'notification';
    const methods = deliveryMethodsFor(notification, type);
    if (!methods.includes('push') || ADMIN_INBOX_TYPES.has(type) || DEPRECATED_PUSH_TYPES.has(type)) {
      return Response.json({ skipped: true, reason: 'Notification registry does not allow push for this type', type, delivery_methods: methods });
    }

    const dedupeKey = notification.dedupe_key || notification.metadata?.dedupe_key || `notification_${userId}_${notification.id || type}_${notification.related_entity_id || 'general'}`;
    const historyNotificationId = await ensureBellHistory(base44, notification, userId, type, methods, dedupeKey);
    const existing = await base44.asServiceRole.entities.PushNotificationDeliveryLog.filter({ dedupe_key: dedupeKey });
    if (existing.length) return Response.json({ skipped: true, reason: 'Duplicate push', history_notification_id: historyNotificationId });

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: userId });
    const pref = prefs[0] || { push_enabled: false, alerts_push_enabled: true };
    if (!pref.push_enabled || !isPushAllowedByPreferences(type, pref)) {
      await base44.asServiceRole.entities.PushNotificationDeliveryLog.create({ user_id: userId, notification_id: historyNotificationId, notification_type: type, source_type: notification.related_entity_type, source_id: notification.related_entity_id, push_sent: false, error_message: 'Push disabled by preference', dedupe_key: dedupeKey });
      return Response.json({ skipped: true, reason: 'Push disabled' });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: userId, is_active: true, permission_status: 'enabled' });
    const subscriptionId = subscriptions[0]?.onesignal_subscription_id;
    if (!subscriptionId) return Response.json({ skipped: true, reason: 'No active push subscription' });

    await sendOneSignal(subscriptionId, String(notification.title || 'Yardit notification').slice(0, 80), String(notification.message || '').slice(0, 180), notification.deep_link || notification.metadata?.url || '');
    await base44.asServiceRole.entities.PushNotificationDeliveryLog.create({ user_id: userId, notification_id: historyNotificationId, notification_type: type, source_type: notification.related_entity_type, source_id: notification.related_entity_id, push_sent: true, push_sent_at: new Date().toISOString(), onesignal_player_id: subscriptionId, dedupe_key: dedupeKey });
    return Response.json({ success: true, history_notification_id: historyNotificationId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});