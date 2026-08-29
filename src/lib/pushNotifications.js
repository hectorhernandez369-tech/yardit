import { enableNativePush, getNativePushConnection, getNativeSubscriptionId, logoutNativePushIdentity } from '@/lib/nativePushNotifications';
import { isNativeYarditApp } from '@/lib/runtimePlatform';

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
  if (isNativeYarditApp()) return null;
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

function describeWorker(worker) {
  if (!worker) return null;
  return { scriptURL: worker.scriptURL, state: worker.state };
}

function describeRegistration(registration) {
  if (!registration) return null;
  return {
    scope: registration.scope,
    active: describeWorker(registration.active),
    waiting: describeWorker(registration.waiting),
    installing: describeWorker(registration.installing),
  };
}

function registrationScopeIncludesRoot(registration) {
  if (typeof window === "undefined" || !registration?.scope) return false;
  return new URL("/", window.location.origin).href.startsWith(registration.scope);
}

function workerScriptUrl(registration) {
  return registration?.active?.scriptURL || registration?.waiting?.scriptURL || registration?.installing?.scriptURL || "";
}

function isOneSignalWorkerRegistration(registration) {
  const scriptUrl = workerScriptUrl(registration);
  return scriptUrl.includes("/OneSignalSDKWorker.js") || scriptUrl.includes("/OneSignalSDKUpdaterWorker.js") || scriptUrl.includes("OneSignalSDK.sw.js");
}

function isBlockingAppWorker(registration) {
  return registrationScopeIncludesRoot(registration) && workerScriptUrl(registration).endsWith("/sw.js");
}

async function getServiceWorkerRegistrations() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return [];
  const registrations = await navigator.serviceWorker.getRegistrations();
  logPushDebug("service_worker_registrations", { registrations: registrations.map(describeRegistration) });
  return registrations;
}

async function rootWorkerFileExists(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    logPushDebug("worker_file_check", { path, ok: response.ok, statusCode: response.status });
    return response.ok;
  } catch (error) {
    logPushDebug("worker_file_check_failed", { path, error: error?.message || String(error) });
    return false;
  }
}

async function waitForServiceWorkerReady() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;

  const workerFilesReady = await Promise.all([
    rootWorkerFileExists("/OneSignalSDKWorker.js"),
    rootWorkerFileExists("/OneSignalSDKUpdaterWorker.js"),
  ]);
  if (!workerFilesReady.every(Boolean)) return false;

  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    let registrations = await getServiceWorkerRegistrations();
    const blockingWorkers = registrations.filter(isBlockingAppWorker);
    if (blockingWorkers.length) {
      logPushDebug("unregister_blocking_app_worker", { registrations: blockingWorkers.map(describeRegistration) });
      await Promise.all(blockingWorkers.map((registration) => registration.unregister()));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      registrations = await getServiceWorkerRegistrations();
    }

    let oneSignalRegistration = registrations.find((registration) => registrationScopeIncludesRoot(registration) && isOneSignalWorkerRegistration(registration));
    if (!oneSignalRegistration) {
      try {
        oneSignalRegistration = await navigator.serviceWorker.register("/OneSignalSDKWorker.js", { scope: "/" });
        logPushDebug("onesignal_worker_register_attempt", { registration: describeRegistration(oneSignalRegistration) });
      } catch (error) {
        logPushDebug("onesignal_worker_register_failed", { error: error?.message || String(error) });
      }
    }

    const readyRegistration = await withTimeout(navigator.serviceWorker.ready.then((registration) => registration).catch(() => null), 2500, null);
    const readyOneSignalRegistration = readyRegistration && registrationScopeIncludesRoot(readyRegistration) && isOneSignalWorkerRegistration(readyRegistration) ? readyRegistration : null;
    const registration = readyOneSignalRegistration || oneSignalRegistration;

    logPushDebug("service_worker_ready_check", {
      readyRegistration: describeRegistration(readyRegistration),
      selectedRegistration: describeRegistration(registration),
      selectedIsOneSignal: isOneSignalWorkerRegistration(registration),
      oneSignalLoaded: !!window.OneSignalDeferred,
    });

    if (registration?.active && registrationScopeIncludesRoot(registration) && isOneSignalWorkerRegistration(registration)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

export function getBrowserPushStatus() {
  if (isNativeYarditApp()) return "not_enabled";
  const preflightFailure = getPreflightFailureStatus();
  if (preflightFailure) return preflightFailure;
  if (window.Notification.permission === "denied") return "blocked";
  if (window.Notification.permission === "granted") return "permission_granted";
  if (!window.OneSignalDeferred) return "onesignal_not_ready";
  return "not_enabled";
}

export async function getRuntimePushConnection() {
  if (isNativeYarditApp()) return getNativePushConnection();
  const browserStatus = getBrowserPushStatus();
  if (browserStatus !== "permission_granted") {
    return { browserStatus, permissionGranted: false, subscriptionId: "", optedIn: false, connected: false };
  }

  const OneSignal = window.__YARDIT_ONESIGNAL_INSTANCE__;
  if (!OneSignal || window.__YARDIT_ONESIGNAL_READY__ !== true) {
    return { browserStatus: "onesignal_not_ready", permissionGranted: true, subscriptionId: "", optedIn: false, connected: false };
  }

  const subscriptionId = OneSignal.User?.PushSubscription?.id || "";
  const optedIn = OneSignal.User?.PushSubscription?.optedIn === true;
  return {
    browserStatus,
    permissionGranted: true,
    subscriptionId,
    optedIn,
    connected: !!subscriptionId && optedIn,
  };
}

export function canStorePushStatus(status) {
  return VALID_STORED_PUSH_STATUSES.includes(status);
}

export function pushStatusLabel(status) {
  if (status === "enabled") return "Connected";
  if (status === "permission_granted") return "Allowed, checking connection";
  if (status === "not_connected") return "Allowed, not connected";
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
  if (isNativeYarditApp()) return enableNativePush({ userId });
  logPushDebug("enable_start");
  const preflightFailure = getPreflightFailureStatus();
  if (preflightFailure) {
    logPushDebug("preflight_failed", { status: preflightFailure });
    return { status: preflightFailure, subscriptionId: "" };
  }

  const OneSignal = window.__YARDIT_ONESIGNAL_INSTANCE__;
  if (!OneSignal || window.__YARDIT_ONESIGNAL_READY__ !== true) {
    logPushDebug("onesignal_not_ready", { initError: window.__YARDIT_ONESIGNAL_INIT_ERROR__ || "" });
    return { status: "onesignal_not_ready", subscriptionId: "" };
  }

  try {
    if (window.Notification.permission !== "granted") {
      const permissionRequest = await withTimeout(OneSignal.Notifications.requestPermission(), 12000, "timeout");
      logPushDebug("permission_result", { permissionResult: getPermissionResult(), permissionRequest });
    }

    if (window.Notification.permission !== "granted") {
      return { status: window.Notification.permission === "denied" ? "blocked" : "not_enabled", subscriptionId: "" };
    }

    const serviceWorkerReady = await waitForServiceWorkerReady();
    if (!serviceWorkerReady) return { status: "service_worker_not_ready", subscriptionId: "" };

    if (userId && OneSignal.login) await withTimeout(OneSignal.login(String(userId)), 12000, null);
    await withTimeout(OneSignal.User.PushSubscription.optIn(), 12000, null);
    const subscriptionId = await waitForOneSignalSubscriptionId(OneSignal);
    const optedIn = OneSignal.User?.PushSubscription?.optedIn === true;
    return { status: subscriptionId && optedIn ? "enabled" : "registration_timeout", subscriptionId, optedIn };
  } catch (error) {
    logPushDebug("enable_error", { error: error?.message || String(error) });
    return { status: "not_enabled", subscriptionId: "", error: error?.message || String(error) };
  }
}

export async function getOneSignalSubscriptionId() {
  if (isNativeYarditApp()) return getNativeSubscriptionId();
  if (typeof window === "undefined") return "";
  const OneSignal = window.__YARDIT_ONESIGNAL_INSTANCE__;
  if (OneSignal && window.__YARDIT_ONESIGNAL_READY__ === true) {
    const subscriptionId = OneSignal.User?.PushSubscription?.id || "";
    logPushDebug("get_subscription_id", { subscriptionId });
    return subscriptionId;
  }
  return "";
}

export async function logoutPushIdentity() {
  if (isNativeYarditApp()) {
    await logoutNativePushIdentity();
    return;
  }
  if (typeof window === 'undefined') return;
  const OneSignal = window.__YARDIT_ONESIGNAL_INSTANCE__;
  if (!OneSignal || window.__YARDIT_ONESIGNAL_READY__ !== true || typeof OneSignal.logout !== 'function') return;
  await withTimeout(OneSignal.logout(), 1500, null);
}