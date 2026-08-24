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
  'residential_access_request',
  'residential_access_approved',
  'residential_access_denied',
  'neighborhood_sale_warning_48h',
  'neighborhood_sale_active',
  'neighborhood_sale_participant_standalone',
  'neighborhood_sale_fallback_applied',
  'neighborhood_sale_fallback_cancelled',
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
  'league_team_connection',
  'league_connected',
  'league_invite',
  'league_connection_approved',
  'league_invite_received',
  'league_join_request',
  'league_join_approved',
  'launch_alert',
]);
const ADMIN_INBOX_TYPES = new Set(['admin', 'admin_note', 'admin_report', 'admin_case', 'admin_billing', 'admin_vendor_account_auto_created', 'billing_cycles']);
const DEPRECATED_PUSH_TYPES = new Set(['fallback_listing', 'vendor', 'nearby_listing', 'vendor_near_me']);

function relationId(value) {
  if (!value) return '';
  if (typeof value === 'object') return String(value.id || value._id || '');
  return String(value);
}

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function timestamp(record) {
  if (!record) return 0;
  const value = record.last_updated_at || record.updated_at || record.updated_date || record.created_at || record.created_date;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestRecord(records = []) {
  return [...records].sort((a, b) => timestamp(b) - timestamp(a))[0] || null;
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

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

async function resolveUserId(base44, notification) {
  const directId = relationId(notification.user_id || notification.userId);
  if (directId) return directId;

  const email = normalizedEmail(notification.user_email || notification.email || notification.recipient_email || notification.recipient?.email);
  if (!email) return '';

  const matches = await base44.asServiceRole.entities.User.filter({ email }).catch(() => []);
  if (matches[0]?.id) return String(matches[0].id);

  const rawEmail = String(notification.user_email || notification.email || notification.recipient_email || notification.recipient?.email || '').trim();
  if (rawEmail && rawEmail !== email) {
    const rawMatches = await base44.asServiceRole.entities.User.filter({ email: rawEmail }).catch(() => []);
    if (rawMatches[0]?.id) return String(rawMatches[0].id);
  }

  return '';
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
    user_email: notification.user_email,
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
  if (normalized.startsWith('join_') || normalized.includes('invite') || normalized.includes('approval') || normalized.startsWith('vendor_event') || normalized.startsWith('league_')) return 'approval_alerts_push_enabled';
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

function notificationAssetUrl(path: string) {
  const base = String(Deno.env.get('APP_BASE_URL') || 'https://yardit.app').trim().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function oneSignalError(result) {
  const detail = result?.errors || result?.error;
  if (!detail) return '';
  return typeof detail === 'string' ? detail : JSON.stringify(detail);
}

async function postOneSignal(target, title, message, url) {
  const rawApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!rawApiKey) throw new Error('OneSignal API key is not configured.');
  const apiKey = rawApiKey.trim().replace(/^Basic\s+/i, '').replace(/^Key\s+/i, '');
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Key ${apiKey}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      ...target,
      headings: { en: title },
      contents: { en: message },
      chrome_web_icon: notificationAssetUrl('/yardit-notification-icon-192.png'),
      chrome_web_badge: notificationAssetUrl('/yardit-notification-badge-72.png'),
      ...(url ? { url } : {})
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(oneSignalError(result) || `OneSignal request failed with status ${response.status}`);
  return result;
}

async function sendOneSignal(subscriptionIds, userId, title, message, url) {
  let subscriptionResult = null;
  if (subscriptionIds.length) {
    subscriptionResult = await postOneSignal({ include_subscription_ids: subscriptionIds }, title, message, url);
    if (Number(subscriptionResult?.recipients || 0) > 0) {
      return { result: subscriptionResult, target: 'subscription_ids', recipientCount: Number(subscriptionResult.recipients || 0) };
    }
  }

  const aliasResult = await postOneSignal({ include_aliases: { external_id: [String(userId)] }, target_channel: 'push' }, title, message, url);
  return {
    result: aliasResult,
    target: 'external_id',
    recipientCount: Number(aliasResult?.recipients || 0),
    previousResult: subscriptionResult,
  };
}

async function saveDeliveryLog(base44, existingLog, record) {
  if (existingLog?.id) {
    await base44.asServiceRole.entities.PushNotificationDeliveryLog.update(existingLog.id, record);
    return existingLog.id;
  }
  const created = await base44.asServiceRole.entities.PushNotificationDeliveryLog.create(record);
  return created.id;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const notification = payload.data || payload.notification || payload;
    const userId = await resolveUserId(base44, notification);
    if (!userId) return Response.json({ success: false, skipped: true, reason: 'No Yardit user could be resolved for this notification' });

    const type = notification.type || 'notification';
    const methods = deliveryMethodsFor(notification, type);
    if (!methods.includes('push') || ADMIN_INBOX_TYPES.has(type) || DEPRECATED_PUSH_TYPES.has(type)) {
      return Response.json({ success: false, skipped: true, reason: 'Notification registry does not allow push for this type', type, delivery_methods: methods });
    }

    const dedupeKey = notification.dedupe_key || notification.metadata?.dedupe_key || `notification_${userId}_${notification.id || type}_${notification.related_entity_id || 'general'}`;
    const historyNotificationId = await ensureBellHistory(base44, notification, userId, type, methods, dedupeKey);
    const existingLogs = await base44.asServiceRole.entities.PushNotificationDeliveryLog.filter({ dedupe_key: dedupeKey });
    const successfulLog = existingLogs.find((row) => row.push_sent === true);
    if (successfulLog) {
      return Response.json({ success: true, skipped: true, reason: 'Duplicate push already reached OneSignal recipient targeting', history_notification_id: historyNotificationId, delivery_log_id: successfulLog.id });
    }
    const retryLog = newestRecord(existingLogs);

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: userId });
    const pref = newestRecord(prefs) || { push_enabled: false, alerts_push_enabled: true };
    if (!pref.push_enabled || !isPushAllowedByPreferences(type, pref)) {
      const errorMessage = 'Push disabled by preference';
      const logId = await saveDeliveryLog(base44, retryLog, compactRecord({ user_id: userId, notification_id: historyNotificationId, notification_type: type, source_type: notification.related_entity_type, source_id: notification.related_entity_id, push_sent: false, error_message: errorMessage, dedupe_key: dedupeKey }));
      return Response.json({ success: false, skipped: true, reason: 'Push disabled', history_notification_id: historyNotificationId, delivery_log_id: logId });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: userId, is_active: true, permission_status: 'enabled' });
    const subscriptionIds = uniqueStrings(subscriptions.map((row) => row.onesignal_subscription_id));
    const title = String(notification.title || 'Yardit notification').slice(0, 80);
    const message = String(notification.message || '').slice(0, 180);
    const url = notification.deep_link || notification.metadata?.url || '';

    const delivery = await sendOneSignal(subscriptionIds, userId, title, message, url);
    if (delivery.recipientCount <= 0) {
      const detail = oneSignalError(delivery.result) || oneSignalError(delivery.previousResult);
      const errorMessage = detail
        ? `OneSignal found 0 active recipients: ${detail}`.slice(0, 500)
        : 'OneSignal found 0 active recipients. Reconnect push notifications on this device.';
      const logId = await saveDeliveryLog(base44, retryLog, compactRecord({
        user_id: userId,
        notification_id: historyNotificationId,
        notification_type: type,
        source_type: notification.related_entity_type,
        source_id: notification.related_entity_id,
        push_sent: false,
        onesignal_player_id: subscriptionIds[0] || `external_id:${userId}`,
        error_message: errorMessage,
        dedupe_key: dedupeKey,
      }));
      return Response.json({
        success: false,
        skipped: false,
        reason: 'No active OneSignal recipient',
        recipient_count: 0,
        target: delivery.target,
        history_notification_id: historyNotificationId,
        delivery_log_id: logId,
      });
    }

    const logId = await saveDeliveryLog(base44, retryLog, compactRecord({
      user_id: userId,
      notification_id: historyNotificationId,
      notification_type: type,
      source_type: notification.related_entity_type,
      source_id: notification.related_entity_id,
      push_sent: true,
      push_sent_at: new Date().toISOString(),
      onesignal_player_id: delivery.target === 'subscription_ids' ? subscriptionIds[0] : `external_id:${userId}`,
      error_message: '',
      dedupe_key: dedupeKey,
    }));

    return Response.json({
      success: true,
      recipient_count: delivery.recipientCount,
      target: delivery.target,
      onesignal_notification_id: delivery.result?.id || null,
      history_notification_id: historyNotificationId,
      delivery_log_id: logId,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});