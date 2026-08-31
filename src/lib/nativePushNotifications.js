import OneSignal from '@onesignal/capacitor-plugin';
import { getYarditRuntimePlatform, isNativeYarditApp } from '@/lib/runtimePlatform';

const ONESIGNAL_APP_ID = '44d72407-6c94-4258-95f7-fd22c3157040';
let initializationPromise = null;

export async function initializeNativePush() {
  if (!isNativeYarditApp()) return false;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      await OneSignal.initialize(ONESIGNAL_APP_ID);
      return true;
    } catch (error) {
      initializationPromise = null;
      if (typeof window !== 'undefined') window.__YARDIT_ONESIGNAL_INIT_ERROR__ = error?.message || String(error);
      return false;
    }
  })();

  return initializationPromise;
}

async function waitForSubscription() {
  for (let i = 0; i < 40; i += 1) {
    const [subscriptionId, pushToken, optedIn] = await Promise.all([
      OneSignal.User.pushSubscription.getIdAsync(),
      OneSignal.User.pushSubscription.getTokenAsync(),
      OneSignal.User.pushSubscription.getOptedInAsync(),
    ]);
    if (subscriptionId && pushToken && optedIn) return { subscriptionId, pushToken, optedIn };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    subscriptionId: (await OneSignal.User.pushSubscription.getIdAsync()) || '',
    pushToken: (await OneSignal.User.pushSubscription.getTokenAsync()) || '',
    optedIn: (await OneSignal.User.pushSubscription.getOptedInAsync()) === true,
  };
}

export async function getNativePushStatus() {
  if (!isNativeYarditApp()) return 'unsupported';
  const ready = await initializeNativePush();
  if (!ready) return 'onesignal_not_ready';

  try {
    const [permission, subscriptionId, pushToken, optedIn, canRequest] = await Promise.all([
      OneSignal.Notifications.hasPermission(),
      OneSignal.User.pushSubscription.getIdAsync(),
      OneSignal.User.pushSubscription.getTokenAsync(),
      OneSignal.User.pushSubscription.getOptedInAsync(),
      OneSignal.Notifications.canRequestPermission(),
    ]);
    if (permission && subscriptionId && pushToken && optedIn) return 'enabled';
    if (!permission && !canRequest) return 'blocked';
    return 'not_enabled';
  } catch {
    return 'onesignal_not_ready';
  }
}

export async function enableNativePush({ userId } = {}) {
  if (!isNativeYarditApp()) return { status: 'unsupported', subscriptionId: '' };
  const ready = await initializeNativePush();
  if (!ready) return { status: 'onesignal_not_ready', subscriptionId: '' };

  try {
    if (userId) await OneSignal.login(String(userId));

    let permission = await OneSignal.Notifications.hasPermission();
    if (!permission) permission = await OneSignal.Notifications.requestPermission(true);
    if (!permission) {
      const canRequest = await OneSignal.Notifications.canRequestPermission();
      return { status: canRequest ? 'not_enabled' : 'blocked', subscriptionId: '' };
    }

    await OneSignal.User.pushSubscription.optIn();
    const { subscriptionId, pushToken, optedIn } = await waitForSubscription();
    const connected = !!subscriptionId && !!pushToken && optedIn;
    return {
      status: connected ? 'enabled' : 'registration_timeout',
      subscriptionId: subscriptionId || '',
      pushToken: pushToken || '',
      optedIn,
      platform: getYarditRuntimePlatform(),
    };
  } catch (error) {
    return {
      status: 'not_enabled',
      subscriptionId: '',
      error: error?.message || String(error),
      platform: getYarditRuntimePlatform(),
    };
  }
}

export async function getNativeSubscriptionId() {
  if (!isNativeYarditApp()) return '';
  const ready = await initializeNativePush();
  if (!ready) return '';
  return (await OneSignal.User.pushSubscription.getIdAsync()) || '';
}
