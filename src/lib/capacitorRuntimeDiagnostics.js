import { Capacitor } from '@capacitor/core';

export function getCapacitorRuntimeDiagnostics() {
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';

  return {
    capacitorPlatform: Capacitor.getPlatform(),
    capacitorNative: Capacitor.isNativePlatform(),
    windowCapacitorExists: hasWindow && !!window.Capacitor,
    locationHref: hasWindow ? window.location.href : 'Unavailable',
    documentReferrer: hasDocument ? document.referrer || 'Empty' : 'Unavailable',
    oneSignalPluginAvailable: Capacitor.isPluginAvailable('OneSignalCapacitor'),
  };
}