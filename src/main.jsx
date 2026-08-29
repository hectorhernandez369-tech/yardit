import '@/index.css'
import { prepareDevelopmentRuntime } from '@/lib/devRuntimeCleanup';

async function bootstrap() {
  const shouldReloadAfterCleanup = await prepareDevelopmentRuntime();
  if (shouldReloadAfterCleanup) {
    window.location.reload();
    return;
  }

  const [
    { default: React },
    { default: ReactDOM },
    { default: App },
    { initializeNativePush },
    { isNativeYarditApp },
    { handoffHostedNativeAuthCallback, initializeNativeAuthBridge },
    { initializeWebPush },
  ] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('@/App.jsx'),
    import('@/lib/nativePushNotifications'),
    import('@/lib/runtimePlatform'),
    import('@/lib/nativeAuthBridge'),
    import('@/lib/webPushBootstrap'),
  ]);

  const handingOffNativeAuth = handoffHostedNativeAuthCallback();

  if (isNativeYarditApp()) {
    void initializeNativeAuthBridge();
    void initializeNativePush();
  } else if (!handingOffNativeAuth) {
    initializeWebPush();
  }

  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));

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

void bootstrap();