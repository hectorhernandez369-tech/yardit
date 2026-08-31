import { isNativeYarditApp } from '@/lib/runtimePlatform';
import {
  enableNativePush,
  getNativeSubscriptionId,
} from '@/lib/nativePushNotifications';
import * as webPush from './pushNotifications.js';

const NATIVE_STATUS_KEY = 'yardit_native_push_status_v1';

export const PUSH_RADIUS_OPTIONS = webPush.PUSH_RADIUS_OPTIONS;
export const canStorePushStatus = webPush.canStorePushStatus;
export const pushStatusLabel = webPush.pushStatusLabel;

export function getBrowserPushStatus() {
  if (!isNativeYarditApp()) return webPush.getBrowserPushStatus();
  try {
    return localStorage.getItem(NATIVE_STATUS_KEY) || 'not_enabled';
  } catch {
    return 'not_enabled';
  }
}

export async function enableOneSignalPush({ userId } = {}) {
  if (!isNativeYarditApp()) return webPush.enableOneSignalPush({ userId });
  const result = await enableNativePush({ userId });
  try {
    localStorage.setItem(NATIVE_STATUS_KEY, result.status || 'not_enabled');
  } catch {}
  return result;
}

export async function getOneSignalSubscriptionId() {
  if (!isNativeYarditApp()) return webPush.getOneSignalSubscriptionId();
  return getNativeSubscriptionId();
}
