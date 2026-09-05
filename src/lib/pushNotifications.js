export const PUSH_RADIUS_OPTIONS = [1, 2, 5, 10, 25];

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
}

function getPreflightFailureStatus() {
  if (typeof window === "undefined") return "unsupported";
  if (isIosDevice() && !isStandaloneApp()) return "needs_install";
  if (!("Notification" in window) || !window.isSecureContext) return "unsupported";
  if (!("serviceWorker" in navigator)) return "unsupported";
  return null;
}

function withTimeout(promise, ms, timeoutValue) {
  let timeoutId;
  const timeout = new Promise((resolve) => { timeoutId = setTimeout(() => resolve(timeoutValue), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export function getBrowserPushStatus() {
  const preflightFailure = getPreflightFailureStatus();
  if (preflightFailure) return preflightFailure;
  if (window.Notification.permission === "granted") return "enabled";
  if (window.Notification.permission === "denied") return "blocked";
  if (!window.OneSignalDeferred) return "onesignal_not_ready";
  return "not_enabled";
}

export function pushStatusLabel(status) {
  if (status === "enabled") return "Enabled";
  if (status === "blocked") return "Blocked by browser/device";
  if (status === "needs_install") return "Install app first";
  if (status === "unsupported") return "Unsupported browser/device";
  return "Not enabled";
}

async function waitForOneSignalSubscriptionId(OneSignal) {
  for (let i = 0; i < 40; i += 1) {
    const subscriptionId = OneSignal.User?.PushSubscription?.id || "";
    if (subscriptionId) return subscriptionId;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return "";
}

export async function enableOneSignalPush({ userId } = {}) {
  const preflightFailure = getPreflightFailureStatus();
  if (preflightFailure) return { status: preflightFailure, subscriptionId: "" };
  if (!window.OneSignalDeferred) return { status: "onesignal_not_ready", subscriptionId: "" };

  return new Promise((resolve) => {
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };
    const readyTimeout = setTimeout(() => finish({ status: "onesignal_not_ready", subscriptionId: "" }), 15000);

    window.OneSignalDeferred.push(async (OneSignal) => {
      clearTimeout(readyTimeout);
      try {
        if (window.Notification.permission !== "granted") {
          await withTimeout(OneSignal.Notifications.requestPermission(), 12000, null);
        }
        if (window.Notification.permission !== "granted") {
          finish({ status: window.Notification.permission === "denied" ? "blocked" : "not_enabled", subscriptionId: "" });
          return;
        }
        if (userId && OneSignal.login) await withTimeout(OneSignal.login(String(userId)), 12000, null);
        await withTimeout(OneSignal.User.PushSubscription.optIn(), 12000, null);
        const subscriptionId = await waitForOneSignalSubscriptionId(OneSignal);
        finish({ status: subscriptionId ? "enabled" : "registration_timeout", subscriptionId });
      } catch {
        finish({ status: "not_enabled", subscriptionId: "" });
      }
    });
  });
}

export async function getOneSignalSubscriptionId() {
  if (typeof window === "undefined" || !window.OneSignalDeferred) return "";
  return new Promise((resolve) => {
    window.OneSignalDeferred.push((OneSignal) => resolve(OneSignal.User?.PushSubscription?.id || ""));
  });
}