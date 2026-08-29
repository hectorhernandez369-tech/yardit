import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initializeNativePush } from '@/lib/nativePushNotifications';
import { isNativeYarditApp } from '@/lib/runtimePlatform';
import { handoffHostedNativeAuthCallback, initializeNativeAuthBridge } from '@/lib/nativeAuthBridge';
import { initializeWebPush } from '@/lib/webPushBootstrap';
import { prepareDevelopmentRuntime } from '@/lib/devRuntimeCleanup';

const shouldReloadAfterCleanup = await prepareDevelopmentRuntime();
if (shouldReloadAfterCleanup) {
  window.location.reload();
} else {
  const handingOffNativeAuth = handoffHostedNativeAuthCallback();

if (isNativeYarditApp()) {
  void initializeNativeAuthBridge();
  void initializeNativePush();
} else if (!handingOffNativeAuth) {
  initializeWebPush();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

requestAnimationFrame(() => {
  document.getElementById('yardit-initial-splash')?.remove();
});

if (!isNativeYarditApp() && 'serviceWorker' in navigator) {
  const oneSignalEnabled = Boolean(window.OneSignalDeferred);

  if (import.meta.env.PROD && oneSignalEnabled) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => {
        const activeScript = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
        if (activeScript.endsWith('/sw.js')) reg.unregister();
      });
    });
  } else if (import.meta.env.PROD && !oneSignalEnabled) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
}