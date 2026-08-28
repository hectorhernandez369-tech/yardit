import { isNativeYarditApp } from '@/lib/nativePushNotifications';

const ONESIGNAL_APP_ID = '44d72407-6c94-4258-95f7-fd22c3157040';

export function initializeWebPush() {
  if (isNativeYarditApp() || typeof window === 'undefined' || window.__YARDIT_WEB_ONESIGNAL_BOOTSTRAPPED__) return;
  window.__YARDIT_WEB_ONESIGNAL_BOOTSTRAPPED__ = true;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.__YARDIT_ONESIGNAL_READY__ = false;

  window.OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        autoResubscribe: true,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
        serviceWorkerParam: { scope: '/' },
      });
      window.__YARDIT_ONESIGNAL_INSTANCE__ = OneSignal;
      window.__YARDIT_ONESIGNAL_READY__ = true;
      OneSignal.User?.PushSubscription?.addEventListener?.('change', function(event) {
        window.dispatchEvent(new CustomEvent('yardit:push-subscription-change', { detail: event?.current || {} }));
      });
      window.dispatchEvent(new Event('yardit:onesignal-ready'));
    } catch (error) {
      window.__YARDIT_ONESIGNAL_READY__ = false;
      window.__YARDIT_ONESIGNAL_INIT_ERROR__ = error?.message || String(error);
      window.dispatchEvent(new Event('yardit:onesignal-error'));
    }
  });

  if (!document.querySelector('script[data-yardit-onesignal-web]')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.dataset.yarditOnesignalWeb = 'true';
    document.head.appendChild(script);
  }
}