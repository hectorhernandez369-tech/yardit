export const PUSH_RADIUS_OPTIONS = [1, 2, 5, 10, 25];

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
}

function hasRequiredPushSupport() {
  return typeof window !== "undefined" && "Notification" in window && window.isSecureContext && "serviceWorker" in navigator;
}

export function getBrowserPushStatus() {
  if (!hasRequiredPushSupport()) return "unsupported";
  if (isIosDevice() && !isStandaloneApp()) return "needs_install";
  if (window.Notification.permission === "granted") return "enabled";
  if (window.Notification.permission === "denied") return "blocked";
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
  return OneSignal.User?.PushSubscription?.id || "";
}

export async function enableOneSignalPush({ userId } = {}) {
  const currentStatus = getBrowserPushStatus();
  if (currentStatus === "unsupported" || currentStatus === "needs_install" || !window.OneSignalDeferred) {
    return { status: currentStatus === "needs_install" ? "needs_install" : "unsupported", subscriptionId: "" };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    setTimeout(() => finish({ status: "unsupported", subscriptionId: "" }), 25000);

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        if (window.Notification.permission !== "granted") {
          finish({ status: window.Notification.permission === "denied" ? "blocked" : "not_enabled", subscriptionId: "" });
          return;
        }
        await OneSignal.User.PushSubscription.optIn();
        if (userId && OneSignal.login) await OneSignal.login(String(userId));
        await OneSignal.User.PushSubscription.optIn();
        const subscriptionId = await waitForOneSignalSubscriptionId(OneSignal);
        finish({ status: subscriptionId ? "enabled" : "not_enabled", subscriptionId });
      } catch {
        finish({ status: "unsupported", subscriptionId: "" });
      }
    });
  });
}

export async function getOneSignalSubscriptionId() {
  if (typeof window === "undefined" || !window.OneSignalDeferred) return "";
  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      resolve(OneSignal.User?.PushSubscription?.id || "");
    });
  });
}