import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isNativeYarditApp, isYarditNativePluginAvailable } from '@/lib/runtimePlatform';

const NATIVE_AUTH_SCHEME = 'yardit://auth-callback';
const HOSTED_APP_ORIGIN = 'https://yardit.base44.app';
const PENDING_STATE_KEY = 'yardit_native_auth_state_v1';
const CONSUMED_STATE_KEY = 'yardit_native_auth_consumed_state_v1';
const AUTH_ERROR_KEY = 'yardit_native_auth_error_v1';
const STATE_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function readParamFromUrl(url, name) {
  try {
    const parsed = new URL(url);
    const direct = parsed.searchParams.get(name);
    if (direct) return direct;
    const hash = parsed.hash.slice(1);
    const query = hash.includes('?') ? hash.split('?').slice(1).join('?') : hash;
    return new URLSearchParams(query).get(name);
  } catch {
    return null;
  }
}

function publishAuthError(message) {
  const error = { type: 'native_auth_failed', message };
  localStorage.setItem(AUTH_ERROR_KEY, JSON.stringify(error));
  window.dispatchEvent(new CustomEvent('yardit:native-auth-error', { detail: error }));
}

function handleNativeAuthUrl(url) {
  if (!url?.toLowerCase().startsWith(NATIVE_AUTH_SCHEME)) return false;

  const state = readParamFromUrl(url, 'state') || '';
  const expectedState = localStorage.getItem(PENDING_STATE_KEY) || '';
  const consumedState = sessionStorage.getItem(CONSUMED_STATE_KEY) || '';
  if (STATE_PATTERN.test(state) && state === consumedState) return true;
  if (!STATE_PATTERN.test(state) || !expectedState || state !== expectedState) {
    publishAuthError('This login response could not be verified. Please try again.');
    return false;
  }

  localStorage.removeItem(PENDING_STATE_KEY);
  sessionStorage.setItem(CONSUMED_STATE_KEY, state);
  const callbackError = readParamFromUrl(url, 'error');
  const accessToken = readParamFromUrl(url, 'access_token');
  if (callbackError || !accessToken) {
    publishAuthError('Login was not completed. Please try again.');
    return false;
  }

  const appCallback = new URL('/', window.location.origin);
  appCallback.searchParams.set('access_token', accessToken);
  window.location.replace(appCallback.toString());
  return true;
}

export function consumeNativeAuthError() {
  try {
    const raw = localStorage.getItem(AUTH_ERROR_KEY);
    localStorage.removeItem(AUTH_ERROR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isValidNativeAuthState(state) {
  return STATE_PATTERN.test(state || '');
}

export function getNativeLoginReturnUrl(state) {
  const callback = new URL('/auth-callback', HOSTED_APP_ORIGIN);
  callback.searchParams.set('yardit_native_auth', '1');
  callback.searchParams.set('state', state);
  return callback.toString();
}

export async function openNativeLogin() {
  if (!isNativeYarditApp() || !isYarditNativePluginAvailable('Browser')) {
    throw new Error('The secure browser is unavailable on this device.');
  }

  const state = crypto.randomUUID().replaceAll('-', '');
  sessionStorage.removeItem(CONSUMED_STATE_KEY);
  localStorage.setItem(PENDING_STATE_KEY, state);
  const startUrl = new URL('/native-auth-start', HOSTED_APP_ORIGIN);
  startUrl.searchParams.set('state', state);

  try {
    await Browser.open({ url: startUrl.toString() });
  } catch (error) {
    localStorage.removeItem(PENDING_STATE_KEY);
    throw error;
  }
}

export async function initializeNativeAuthBridge() {
  if (!isNativeYarditApp()) return false;

  await CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url?.toLowerCase().startsWith(NATIVE_AUTH_SCHEME)) return;
    await Browser.close().catch(() => null);
    handleNativeAuthUrl(url);
  });

  const launchUrl = await CapacitorApp.getLaunchUrl().catch(() => null);
  if (launchUrl?.url?.toLowerCase().startsWith(NATIVE_AUTH_SCHEME)) {
    await Browser.close().catch(() => null);
    handleNativeAuthUrl(launchUrl.url);
  }

  return true;
}