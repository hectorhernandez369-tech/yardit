import { Capacitor } from '@capacitor/core';

export function isNativeYarditApp() {
  return Capacitor.isNativePlatform();
}

export function getYarditRuntimePlatform() {
  return Capacitor.getPlatform();
}

export function isYarditNativePluginAvailable(pluginName) {
  return isNativeYarditApp() && Capacitor.isPluginAvailable(pluginName);
}
