import { App as CapacitorApp } from '@capacitor/app';
import { appParams, getStoredAccessToken } from '@/lib/app-params';
import { getCapacitorRuntimeDiagnostics } from '@/lib/capacitorRuntimeDiagnostics';
import { isNativeYarditApp } from '@/lib/runtimePlatform';

async function getInstalledAppInfo() {
  if (!isNativeYarditApp()) {
    return {
      appName: 'Web/PWA',
      appId: 'Not native',
      appVersion: 'Not native',
      appBuild: 'Not native',
    };
  }

  try {
    const info = await CapacitorApp.getInfo();
    return {
      appName: info?.name || 'Unknown',
      appId: info?.id || 'Unknown',
      appVersion: info?.version || 'Unknown',
      appBuild: info?.build || 'Unknown',
    };
  } catch (error) {
    return {
      appName: 'Unavailable',
      appId: 'Unavailable',
      appVersion: 'Unavailable',
      appBuild: 'Unavailable',
      appInfoError: error?.message || String(error),
    };
  }
}

async function getLocationDiagnostics() {
  const geolocationSupported = typeof navigator !== 'undefined' && !!navigator.geolocation;
  let permissionState = 'Unavailable';

  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      permissionState = result?.state || 'Unknown';
    } catch {
      permissionState = geolocationSupported ? 'Supported; permission state unavailable' : 'Unsupported';
    }
  } else if (!geolocationSupported) {
    permissionState = 'Unsupported';
  }

  return {
    geolocationSupported,
    geolocationPermissionState: permissionState,
  };
}

export async function getNativeHealthDiagnostics() {
  const [installedApp, location] = await Promise.all([
    getInstalledAppInfo(),
    getLocationDiagnostics(),
  ]);

  return {
    ...getCapacitorRuntimeDiagnostics(),
    ...installedApp,
    ...location,
    base44AppId: appParams.appId || 'Missing',
    base44ServerUrl: appParams.serverUrl || 'Missing',
    storedAuthTokenPresent: !!getStoredAccessToken(),
    authFlow: 'Base44 SDK WebView',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unavailable',
  };
}