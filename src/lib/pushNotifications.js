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

async function waitForOneSignalSubscriptionId(OneSignal) {
  for (let i = 0; i < 10; i += 1) {
    const subscriptionId = OneSignal.User?.PushSubscription?.id || "";
    if (subscriptionId) return subscriptionId;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return OneSignal.User?.PushSubscription?.id || "";
}

export async function enableOneSignalPush({ userId } = {}) {
  if (typeof window === "undefined" || !("Notification" in window) || !window.OneSignalDeferred) {
    return { status: "unsupported", subscriptionId: "" };
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (userId && OneSignal.login) await OneSignal.login(String(userId));
        await OneSignal.Notifications.requestPermission();
        if (window.Notification.permission !== "granted") {
          resolve({ status: window.Notification.permission === "denied" ? "blocked" : "not_enabled", subscriptionId: "" });
          return;
        }
        await OneSignal.User.PushSubscription.optIn();
        const subscriptionId = await waitForOneSignalSubscriptionId(OneSignal);
        resolve({ status: subscriptionId ? "enabled" : "not_enabled", subscriptionId });
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