import '@/index.css'
import { prepareDevelopmentRuntime } from '@/lib/devRuntimeCleanup';

async function bootstrap() {
  const shouldReloadAfterCleanup = await prepareDevelopmentRuntime();
  if (shouldReloadAfterCleanup) {
    window.location.reload();
    return;
  }

  const { handoffHostedNativeAuthCallback } = await import('@/lib/hostedNativeAuthHandoff');
  if (handoffHostedNativeAuthCallback()) return;

  if (window.location.pathname.toLowerCase() === '/native-auth-start') {
    const [{ default: React }, { default: ReactDOM }, { default: NativeAuthStart }] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('@/pages/NativeAuthStart.jsx'),
    ]);
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(NativeAuthStart));
    document.getElementById('yardit-initial-splash')?.remove();
    return;
  }

  const { isNativeYarditApp } = await import('@/lib/runtimePlatform');
  const nativeApp = isNativeYarditApp();
  if (nativeApp) {
    const { initializeNativeAuthBridge } = await import('@/lib/nativeAuthBridge');
    await initializeNativeAuthBridge();
  }

  const [{ default: React }, { default: ReactDOM }, { default: App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('@/App.jsx'),
  ]);

  if (nativeApp) {
    const { initializeNativePush } = await import('@/lib/nativePushNotifications');
    void initializeNativePush();
  } else {
    const { initializeWebPush } = await import('@/lib/webPushBootstrap');
    initializeWebPush();
  }

  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));

  requestAnimationFrame(() => {
    document.getElementById('yardit-initial-splash')?.remove();
  });

  if (!nativeApp && 'serviceWorker' in navigator) {
    const oneSignalEnabled = Boolean(window.OneSignalDeferred);

    if (import.meta.env.PROD && oneSignalEnabled) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          const activeScript = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
          if (activeScript.endsWith('/sw.js')) reg.unregister();
        });
      });
    } else if (import.meta.env.PROD && !oneSignalEnabled) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
    }
  }

  if (import.meta.hot) {
    import.meta.hot.on('vite:beforeUpdate', () => window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*'));
    import.meta.hot.on('vite:afterUpdate', () => window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*'));
  }
}

void bootstrap();