import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { isNativeYarditApp, initializeNativePush } from '@/lib/nativePushNotifications';
import { initializeWebPush } from '@/lib/webPushBootstrap';

if (isNativeYarditApp()) {
  void initializeNativePush();
} else {
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

if ('serviceWorker' in navigator) {
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
  } else if (!import.meta.env.PROD) {
    // In dev mode, unregister any stale service workers to avoid caching issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
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