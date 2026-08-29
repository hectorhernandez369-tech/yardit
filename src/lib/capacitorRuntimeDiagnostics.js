import { getYarditRuntimePlatform, isNativeYarditApp, isYarditNativePluginAvailable } from '@/lib/runtimePlatform';

export function getCapacitorRuntimeDiagnostics() {
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';

  return {
    capacitorPlatform: getYarditRuntimePlatform(),
    capacitorNative: isNativeYarditApp(),
    windowCapacitorExists: hasWindow && !!window.Capacitor,
    locationHref: hasWindow ? window.location.href : 'Unavailable',
    documentReferrer: hasDocument ? document.referrer || 'Empty' : 'Unavailable',
    oneSignalPluginAvailable: isYarditNativePluginAvailable('OneSignalCapacitor'),
  };
}