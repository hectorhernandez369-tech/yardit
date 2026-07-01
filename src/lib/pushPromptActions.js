import { base44 } from "@/api/base44Client";
import { canStorePushStatus, enableOneSignalPush, getOneSignalSubscriptionId } from "@/lib/pushNotifications";

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

export const declinedPromptKey = (userId) => `yardit_push_prompt_declined_${userId}`;

export async function shouldShowPushPrompt(user) {
  if (!user?.id || localStorage.getItem(declinedPromptKey(user.id)) === "true") return false;
  const [preference] = await base44.entities.NotificationPreference.filter({ user_id: user.id });
  const [subscription] = await base44.entities.PushSubscription.filter({ user_id: user.id });
  return !(preference?.push_enabled === true && subscription?.permission_status === "enabled" && subscription?.is_active === true && subscription?.onesignal_subscription_id);
}

export async function enablePushPromptSubscription(user) {
  const result = await enableOneSignalPush({ userId: user.id });
  const subscriptionId = result.subscriptionId || await getOneSignalSubscriptionId();

  if (canStorePushStatus(result.status)) {
    const [existingSubscription] = await base44.entities.PushSubscription.filter({ user_id: user.id });
    const data = { user_id: user.id, onesignal_subscription_id: subscriptionId, permission_status: result.status, is_active: result.status === "enabled", user_agent: navigator.userAgent, updated_at: new Date().toISOString() };
    if (existingSubscription) await base44.entities.PushSubscription.update(existingSubscription.id, data);
    else await base44.entities.PushSubscription.create({ ...data, created_at: new Date().toISOString() });
  }

  if (result.status === "enabled" && subscriptionId) {
    const [preference] = await base44.entities.NotificationPreference.filter({ user_id: user.id });
    const prefData = { ...DEFAULT_PREFS, ...(preference || {}), push_enabled: true, user_id: user.id, last_updated_at: new Date().toISOString() };
    if (preference) await base44.entities.NotificationPreference.update(preference.id, prefData);
    else await base44.entities.NotificationPreference.create(prefData);
  }

  return { ...result, subscriptionId };
}