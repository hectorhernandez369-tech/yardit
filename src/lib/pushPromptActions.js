import { base44 } from "@/api/base44Client";
import { enableOneSignalPush, getBrowserPushStatus, getOneSignalSubscriptionId } from "@/lib/pushNotifications";
import { savePushSubscription } from "@/lib/savePushSubscription";
import { isPlayStoreWebWrapper, openWebPushSetup } from "@/lib/webPushHandoff";

export const declinedPromptKey = (userId) => `yardit_push_prompt_declined_${userId}`;
export const afterSetupPromptKey = (userId) => `yardit_push_prompt_after_setup_${userId}`;
export const lastPushErrorKey = (userId) => `yardit_push_last_error_${userId}`;

const canLogPushDecision = (user) => import.meta.env?.DEV || user?.isAdmin === true || ["admin", "master", "super_master", "supervisor"].includes(user?.role);

export function logPushPromptDecision(user, source, decision) {
  if (canLogPushDecision(user)) console.info("[Yardit Push Prompt]", source, decision);
}

export async function evaluatePushPromptEligibility(user) {
  if (!user?.id) return { show: false, reason: "missing_user" };
  if (localStorage.getItem(declinedPromptKey(user.id)) === "true") return { show: false, reason: "declined_flag" };

  const [preference] = await base44.entities.NotificationPreference.filter({ user_id: user.id });
  const subscriptions = await base44.entities.PushSubscription.filter({ user_id: user.id });
  const subscription = subscriptions.find((item) => item.permission_status === "enabled" && item.is_active === true && item.onesignal_subscription_id);
  if (preference?.push_enabled === true && subscription) return { show: false, reason: "already_subscribed", subscriptionId: subscription.onesignal_subscription_id };

  if (isPlayStoreWebWrapper()) return { show: true, reason: "play_wrapper_web_handoff", browserStatus: "web_handoff" };

  const browserStatus = getBrowserPushStatus();
  if (["unsupported", "needs_install"].includes(browserStatus)) return { show: false, reason: browserStatus, browserStatus };
  if (browserStatus === "onesignal_not_ready") return { show: false, reason: "onesignal_not_ready", browserStatus, retryable: true };
  return { show: true, reason: browserStatus === "blocked" ? "blocked_permission_help" : "direct_web_setup", browserStatus };
}

export async function enablePushPromptSubscription(user) {
  if (isPlayStoreWebWrapper()) {
    const opened = await openWebPushSetup();
    return { status: opened ? "web_handoff" : "unsupported", subscriptionId: "" };
  }

  const result = await enableOneSignalPush({ userId: user.id });
  const subscriptionId = result.subscriptionId || await getOneSignalSubscriptionId();
  if (result.status === "enabled" && subscriptionId) {
    await savePushSubscription({ subscriptionId });
    localStorage.removeItem(lastPushErrorKey(user.id));
  } else {
    localStorage.setItem(lastPushErrorKey(user.id), result.status || "not_enabled");
  }
  return { ...result, subscriptionId };
}