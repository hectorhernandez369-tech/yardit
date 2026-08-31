import { Geolocation } from '@capacitor/geolocation';
import { isNativeYarditApp } from '@/lib/runtimePlatform';

export async function getNativeLocationPermissionStatus() {
  if (!isNativeYarditApp()) return { location: 'web' };
  try {
    return await Geolocation.checkPermissions();
  } catch (error) {
    return { location: 'error', error: error?.message || String(error) };
  }
}

export async function requestNativeLocationPermission() {
  if (!isNativeYarditApp()) return { location: 'web' };
  try {
    return await Geolocation.requestPermissions({ permissions: ['location'] });
  } catch (error) {
    return { location: 'error', error: error?.message || String(error) };
  }
}
