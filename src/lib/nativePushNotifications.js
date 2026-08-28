import { Capacitor } from '@capacitor/core';
import OneSignal from '@onesignal/capacitor-plugin';

const ONESIGNAL_APP_ID = '44d72407-6c94-4258-95f7-fd22c3157040';
const PLAY_WRAPPER_KEY = 'yardit_play_wrapper_detected_v1';
let initializationPromise = null;
let listenersAttached = false;

function isDetectedPlayWrapper() {
  if (typeof window === 'undefined') return false;

  const androidAppReferrer = typeof document !== 'undefined' && document.referrer?.startsWith('android-app://');
  if (androidAppReferrer) {
    try {
      sessionStorage.setItem(PLAY_WRAPPER_KEY, 'true');
      localStorage.setItem(PLAY_WRAPPER_KEY, 'true');
    } catch {}
    return true;
  }

  try {
    return sessionStorage.getItem(PLAY_WRAPPER_KEY) === 'true' || localStorage.getItem(PLAY_WRAPPER_KEY) === 'true';
  } catch {
    return false;
  }
}

// This is the only source of truth for native capabilities and push routing.
export function isNativeYarditApp() {
  return Capacitor.isNativePlatform();
}

// Wrapper detection is diagnostic only. It must never select native APIs.
export function isPlayYarditWrapper() {
  return !isNativeYarditApp() && isDetectedPlayWrapper();
}

export function getNativePushPlatform() {
  if (isNativeYarditApp()) {
    const platform = Capacitor.getPlatform();
    return platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'web';
  }
  return isDetectedPlayWrapper() ? 'android-wrapper' : 'web';
}

function emitNativePushChange(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('yardit:push-subscription-change', { detail }));
}

function routeNativeNotification(deepLink) {
  if (typeof window === 'undefined' || !deepLink) return;
  try {
    const target = new URL(String(deepLink), 'https://yardit.app');
    if (target.hostname !== 'yardit.app' && target.hostname !== 'www.yardit.app') return;
    const localTarget = `${target.pathname}${target.search}${target.hash}` || '/';
    window.history.pushState({}, '', localTarget);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch (error) {
    console.warn('[Yardit Push] Could not open notification destination', error);
  }
}

export async function initializeNativePush() {
  if (!isNativeYarditApp()) return false;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      await OneSignal.initialize(ONESIGNAL_APP_ID);

      if (!listenersAttached) {
        listenersAttached = true;
        OneSignal.User.pushSubscription.addEventListener('change', (event) => {
          emitNativePushChange(event?.current || {});
        });
        OneSignal.Notifications.addEventListener('permissionChange', (permission) => {
          emitNativePushChange({ permission });
        });
        OneSignal.Notifications.addEventListener('click', (event) => {
          const deepLink = event?.notification?.additionalData?.deep_link;
          routeNativeNotification(deepLink);
        });
      }

      if (typeof window !== 'undefined') {
        window.__YARDIT_NATIVE_ONESIGNAL_READY__ = true;
        window.dispatchEvent(new Event('yardit:onesignal-ready'));
      }
      return true;
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.__YARDIT_NATIVE_ONESIGNAL_READY__ = false;
        window.__YARDIT_ONESIGNAL_INIT_ERROR__ = error?.message || String(error);
        window.dispatchEvent(new Event('yardit:onesignal-error'));
      }
      initializationPromise = null;
      return false;
    }
  })();

  return initializationPromise;
}

export async function bindNativePushIdentity(userId) {
  if (!isNativeYarditApp() || !userId) return false;
  const ready = await initializeNativePush();
  if (!ready) return false;
  await OneSignal.login(String(userId));
  return true;
}

export async function getNativePushConnection() {
  if (!isNativeYarditApp()) {
    return { browserStatus: 'unsupported', permissionGranted: false, subscriptionId: '', pushToken: '', optedIn: false, connected: false, platform: 'web' };
  }

  const ready = await initializeNativePush();
  if (!ready) {
    return {
      browserStatus: 'onesignal_not_ready',
      permissionGranted: false,
      subscriptionId: '',
      pushToken: '',
      optedIn: false,
      connected: false,
      platform: Capacitor.getPlatform(),
      error: window.__YARDIT_ONESIGNAL_INIT_ERROR__ || 'Native OneSignal initialization failed',
    };
  }

  try {
    const [permissionGranted, subscriptionId, pushToken, optedIn, canRequest] = await Promise.all([
      OneSignal.Notifications.hasPermission(),
      OneSignal.User.pushSubscription.getIdAsync(),
      OneSignal.User.pushSubscription.getTokenAsync(),
      OneSignal.User.pushSubscription.getOptedInAsync(),
      OneSignal.Notifications.canRequestPermission(),
    ]);
    const connected = permissionGranted === true && !!subscriptionId && !!pushToken && optedIn === true;
    const browserStatus = connected
      ? 'enabled'
      : permissionGranted
        ? 'permission_granted'
        : canRequest
          ? 'not_enabled'
          : 'blocked';

    return {
      browserStatus,
      permissionGranted: permissionGranted === true,
      subscriptionId: subscriptionId || '',
      pushToken: pushToken || '',
      optedIn: optedIn === true,
      connected,
      platform: Capacitor.getPlatform(),
    };
  } catch (error) {
    return {
      browserStatus: 'onesignal_not_ready',
      permissionGranted: false,
      subscriptionId: '',
      pushToken: '',
      optedIn: false,
      connected: false,
      platform: Capacitor.getPlatform(),
      error: error?.message || String(error),
    };
  }
}

async function waitForNativeSubscription() {
  for (let i = 0; i < 40; i += 1) {
    const [subscriptionId, pushToken, optedIn] = await Promise.all([
      OneSignal.User.pushSubscription.getIdAsync(),
      OneSignal.User.pushSubscription.getTokenAsync(),
      OneSignal.User.pushSubscription.getOptedInAsync(),
    ]);
    if (subscriptionId && pushToken && optedIn) {
      return { subscriptionId, pushToken, optedIn };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    subscriptionId: (await OneSignal.User.pushSubscription.getIdAsync()) || '',
    pushToken: (await OneSignal.User.pushSubscription.getTokenAsync()) || '',
    optedIn: (await OneSignal.User.pushSubscription.getOptedInAsync()) === true,
  };
}

export async function enableNativePush({ userId } = {}) {
  if (!isNativeYarditApp()) return { status: 'unsupported', subscriptionId: '' };
  const ready = await initializeNativePush();
  if (!ready) return { status: 'onesignal_not_ready', subscriptionId: '' };

  try {
    if (userId) await OneSignal.login(String(userId));

    let permissionGranted = await OneSignal.Notifications.hasPermission();
    if (!permissionGranted) {
      permissionGranted = await OneSignal.Notifications.requestPermission(true);
    }

    if (!permissionGranted) {
      const canRequest = await OneSignal.Notifications.canRequestPermission();
      return { status: canRequest ? 'not_enabled' : 'blocked', subscriptionId: '' };
    }

    await OneSignal.User.pushSubscription.optIn();
    const { subscriptionId, pushToken, optedIn } = await waitForNativeSubscription();
    const connected = !!subscriptionId && !!pushToken && optedIn;

    return {
      status: connected ? 'enabled' : 'registration_timeout',
      subscriptionId: subscriptionId || '',
      pushToken: pushToken || '',
      optedIn,
      platform: Capacitor.getPlatform(),
    };
  } catch (error) {
    return {
      status: 'not_enabled',
      subscriptionId: '',
      error: error?.message || String(error),
      platform: Capacitor.getPlatform(),
    };
  }
}

export async function getNativeSubscriptionId() {
  if (!isNativeYarditApp()) return '';
  const ready = await initializeNativePush();
  if (!ready) return '';
  return (await OneSignal.User.pushSubscription.getIdAsync()) || '';
}

export async function logoutNativePushIdentity() {
  if (!isNativeYarditApp()) return;
  const ready = await initializeNativePush();
  if (!ready) return;
  await OneSignal.logout();
}