export const PUSH_RADIUS_OPTIONS = [1, 2, 5, 10, 25];

export function getBrowserPushStatus() {
  if (typeof window === "undefined" || !("Notification" in window) || !window.OneSignalDeferred) return "unsupported";
  if (window.Notification.permission === "granted") return "enabled";
  if (window.Notification.permission === "denied") return "blocked";
  return "not_enabled";
}

export function pushStatusLabel(status) {
  if (status === "enabled") return "Enabled";
  if (status === "blocked") return "Blocked by browser/device";
  if (status === "unsupported") return "Unsupported browser";
  return "Not enabled";
}

export async function enableOneSignalPush() {
  if (typeof window === "undefined" || !("Notification" in window) || !window.OneSignalDeferred) {
    return { status: "unsupported", subscriptionId: "" };
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        if (window.Notification.permission !== "granted") {
          resolve({ status: window.Notification.permission === "denied" ? "blocked" : "not_enabled", subscriptionId: "" });
          return;
        }
        await OneSignal.User.PushSubscription.optIn();
        resolve({ status: "enabled", subscriptionId: OneSignal.User.PushSubscription.id || "" });
      } catch {
        resolve({ status: "unsupported", subscriptionId: "" });
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