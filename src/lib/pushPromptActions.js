import { base44 } from "@/api/base44Client";
import { canStorePushStatus, enableOneSignalPush, getBrowserPushStatus, getOneSignalSubscriptionId } from "@/lib/pushNotifications";
import { isPlayStoreWebWrapper, openWebPushSetup } from "@/lib/webPushHandoff";

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
export const afterSetupPromptKey = (userId) => `yardit_push_prompt_after_setup_${userId}`;
export const lastPushErrorKey = (userId) => `yardit_push_last_error_${userId}`;

const canLogPushDecision = (user) => import.meta.env?.DEV || user?.isAdmin === true || ["admin", "master", "super_master", "supervisor"].includes(user?.role);

export function logPushPromptDecision(user, source, decision) {
  if (!canLogPushDecision(user)) return;
  console.info("[Yardit Push Prompt]", source, {
    userSetupComplete: source === "account_setup_complete" || sessionStorage.getItem(afterSetupPromptKey(user?.id)) === "true",
    oneSignalReady: typeof window !== "undefined" && !!window.OneSignalDeferred,
    notificationPermission: typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported",
    standaloneMode: typeof window !== "undefined" ? window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true : false,
    declinedFlag: user?.id ? localStorage.getItem(declinedPromptKey(user.id)) === "true" : false,
    lastPushError: user?.id ? localStorage.getItem(lastPushErrorKey(user.id)) || "" : "",
    ...decision,
  });
}

export async function evaluatePushPromptEligibility(user) {
  if (!user?.id) return { show: false, reason: "missing_user" };
  if (localStorage.getItem(declinedPromptKey(user.id)) === "true") return { show: false, reason: "declined_flag" };

  const [preference] = await base44.entities.NotificationPreference.filter({ user_id: user.id });
  const [subscription] = await base44.entities.PushSubscription.filter({ user_id: user.id });
  const alreadySubscribed = preference?.push_enabled === true && subscription?.permission_status === "enabled" && subscription?.is_active === true && subscription?.onesignal_subscription_id;
  if (alreadySubscribed) return { show: false, reason: "already_subscribed", subscriptionId: subscription.onesignal_subscription_id };

  if (isPlayStoreWebWrapper()) {
    return { show: true, reason: "play_wrapper_web_handoff", browserStatus: "web_handoff" };
  }

  const browserStatus = getBrowserPushStatus();
  if (["blocked", "unsupported", "needs_install", "service_worker_not_ready"].includes(browserStatus)) return { show: false, reason: browserStatus, browserStatus };
  if (browserStatus === "onesignal_not_ready") return { show: false, reason: "onesignal_not_ready", browserStatus, retryable: true };

  const runtimeSubscriptionId = await getOneSignalSubscriptionId();
  return { show: true, reason: browserStatus === "enabled" ? "eligible_permission_granted" : "eligible", browserStatus, subscriptionId: runtimeSubscriptionId };
}

export async function shouldShowPushPrompt(user) {
  const decision = await evaluatePushPromptEligibility(user);
  return decision.show;
}

export async function syncGrantedPushSubscription(user) {
  if (isPlayStoreWebWrapper()) return { status: "web_handoff", subscriptionId: "", synced: false };
  if (!user?.id || typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") {
    return { status: "not_enabled", subscriptionId: "", synced: false };
  }
  const result = await enablePushPromptSubscription(user);
  return { ...result, synced: result.status === "enabled" && !!result.subscriptionId };
}

export async function enablePushPromptSubscription(user) {
  if (isPlayStoreWebWrapper()) {
    const opened = await openWebPushSetup();
    return { status: opened ? "web_handoff" : "unsupported", subscriptionId: "" };
  }

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
    localStorage.removeItem(lastPushErrorKey(user.id));
  } else if (result.status !== "enabled") {
    localStorage.setItem(lastPushErrorKey(user.id), result.status || "not_enabled");
  }

  return { ...result, subscriptionId };
}