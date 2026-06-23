export const PUSH_RADIUS_OPTIONS = [1, 2, 5, 10, 25];

const VALID_STORED_PUSH_STATUSES = ["enabled", "not_enabled", "blocked", "unsupported"];

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
}

function getPermissionResult() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
  return window.Notification.permission;
}

function getPushDiagnostics(extra = {}) {
  const subscriptionId = extra.subscriptionId || "";
  return {
    browser: typeof navigator !== "undefined" ? navigator.userAgent : "unavailable",
    isSecureContext: typeof window !== "undefined" ? window.isSecureContext : false,
    notificationSupport: typeof window !== "undefined" && "Notification" in window,
    serviceWorkerSupport: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    standaloneMode: isStandaloneApp(),
    oneSignalLoaded: typeof window !== "undefined" && !!window.OneSignalDeferred,
    permissionResult: getPermissionResult(),
    subscriptionId,
    ...extra,
  };
}

function logPushDebug(stage, extra = {}) {
  if (import.meta.env?.DEV) {
    console.debug("[Yardit Push]", stage, getPushDiagnostics(extra));
  }
}

function getPreflightFailureStatus() {
  if (typeof window === "undefined") return "unsupported";
  if (isIosDevice() && !isStandaloneApp()) return "needs_install";
  if (!("Notification" in window) || !window.isSecureContext) return "unsupported";
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return "service_worker_not_ready";
  return null;
}

function withTimeout(promise, ms, timeoutValue) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(timeoutValue), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function waitForServiceWorkerReady() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const registration = await withTimeout(navigator.serviceWorker.ready.then(() => true).catch(() => false), 8000, false);
  return registration === true;
}

export function getBrowserPushStatus() {
  const preflightFailure = getPreflightFailureStatus();
  if (preflightFailure) return preflightFailure;
  if (window.Notification.permission === "granted") return "enabled";
  if (window.Notification.permission === "denied") return "blocked";
  if (!window.OneSignalDeferred) return "onesignal_not_ready";
  return "not_enabled";
}

export function canStorePushStatus(status) {
  return VALID_STORED_PUSH_STATUSES.includes(status);
}

export function pushStatusLabel(status) {
  if (status === "enabled") return "Enabled";
  if (status === "blocked") return "Blocked by browser/device";
  if (status === "needs_install") return "Install app first";
  if (status === "onesignal_not_ready") return "Push service loading";
  if (status === "registration_timeout") return "Registration timed out";
  if (status === "service_worker_not_ready") return "Service worker not ready";
  if (status === "unsupported") return "Unsupported browser/device";
  return "Not enabled";
}

async function waitForOneSignalSubscriptionId(OneSignal) {
  for (let i = 0; i < 40; i += 1) {
    const subscriptionId = OneSignal.User?.PushSubscription?.id || "";
    logPushDebug("subscription_check", { subscriptionId });
    if (subscriptionId) return subscriptionId;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return OneSignal.User?.PushSubscription?.id || "";
}

export async function enableOneSignalPush({ userId } = {}) {
  logPushDebug("enable_start");
  const preflightFailure = getPreflightFailureStatus();
  if (preflightFailure) {
    logPushDebug("preflight_failed", { status: preflightFailure });
    return { status: preflightFailure, subscriptionId: "" };
  }

  if (!window.OneSignalDeferred) {
    logPushDebug("onesignal_not_ready");
    return { status: "onesignal_not_ready", subscriptionId: "" };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      logPushDebug("enable_finish", result);
      resolve(result);
    };

    const oneSignalReadyTimeout = setTimeout(() => finish({ status: "onesignal_not_ready", subscriptionId: "" }), 15000);

    window.OneSignalDeferred.push(async (OneSignal) => {
      clearTimeout(oneSignalReadyTimeout);
      try {
        const serviceWorkerReady = await waitForServiceWorkerReady();
        if (!serviceWorkerReady) {
          finish({ status: "service_worker_not_ready", subscriptionId: "" });
          return;
        }

        await OneSignal.Notifications.requestPermission();
        logPushDebug("permission_result", { permissionResult: getPermissionResult() });
        if (window.Notification.permission !== "granted") {
          finish({ status: window.Notification.permission === "denied" ? "blocked" : "not_enabled", subscriptionId: "" });
          return;
        }

        await OneSignal.User.PushSubscription.optIn();
        if (userId && OneSignal.login) await OneSignal.login(String(userId));
        await OneSignal.User.PushSubscription.optIn();
        const subscriptionId = await waitForOneSignalSubscriptionId(OneSignal);
        finish({ status: subscriptionId ? "enabled" : "registration_timeout", subscriptionId });
      } catch (error) {
        logPushDebug("enable_error", { error: error?.message || String(error) });
        finish({ status: "not_enabled", subscriptionId: "" });
      }
    });
  });
}

export async function getOneSignalSubscriptionId() {
  if (typeof window === "undefined" || !window.OneSignalDeferred) return "";
  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      const subscriptionId = OneSignal.User?.PushSubscription?.id || "";
      logPushDebug("get_subscription_id", { subscriptionId });
      resolve(subscriptionId);
    });
  });
}