import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { recordAuthDebugEvent } from '@/lib/authDebug';

const BASE44_ACCESS_TOKEN_KEY = 'base44_access_token';
const NATIVE_AUTH_SCHEME = 'yardit://auth-callback';
const HOSTED_NATIVE_AUTH_FLAG = 'yardit_native_auth';

function readParamFromUrl(url, name) {
  try {
    const parsed = new URL(url);
    const fromSearch = parsed.searchParams.get(name);
    if (fromSearch) return fromSearch;

    const rawHash = parsed.hash ? parsed.hash.slice(1) : '';
    if (!rawHash) return null;
    const hashQuery = rawHash.includes('?') ? rawHash.split('?').slice(1).join('?') : rawHash;
    return new URLSearchParams(hashQuery).get(name);
  } catch {
    return null;
  }
}

function handleNativeAuthUrl(url) {
  if (!url || !url.toLowerCase().startsWith(NATIVE_AUTH_SCHEME)) return false;

  const accessToken = readParamFromUrl(url, 'access_token');
  if (!accessToken) {
    console.warn('[Yardit Auth] Native callback opened without an access token');
    recordAuthDebugEvent('native_auth_callback_missing_token', {
      callbackSchemeMatched: true,
      hasSearch: url.includes('?'),
      hasHash: url.includes('#'),
    });
    return false;
  }

  try {
    localStorage.setItem(BASE44_ACCESS_TOKEN_KEY, accessToken);
  } catch (error) {
    console.error('[Yardit Auth] Could not save native login token', error);
    return false;
  }

  window.location.replace('/');
  return true;
}

export function getNativeLoginReturnUrl() {
  return `https://yardit.app/?${HOSTED_NATIVE_AUTH_FLAG}=1`;
}

export function handoffHostedNativeAuthCallback() {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return false;

  const current = new URL(window.location.href);
  if (current.searchParams.get(HOSTED_NATIVE_AUTH_FLAG) !== '1') return false;

  const accessToken = readParamFromUrl(window.location.href, 'access_token');
  if (!accessToken) {
    console.warn('[Yardit Auth] Hosted native handoff opened without an access token', {
      hasSearch: Boolean(window.location.search),
      hasHash: Boolean(window.location.hash),
    });
    recordAuthDebugEvent('hosted_native_auth_handoff_missing_token', {
      hasSearch: Boolean(window.location.search),
      hasHash: Boolean(window.location.hash),
      referrerOrigin: document.referrer ? new URL(document.referrer).origin : '',
    });
    return false;
  }

  console.info('[Yardit Auth] Hosted native handoff received an access token');
  recordAuthDebugEvent('hosted_native_auth_handoff_token_received', {
    hasSearch: Boolean(window.location.search),
    hasHash: Boolean(window.location.hash),
  });

  const callbackParams = new URLSearchParams();
  callbackParams.set('access_token', accessToken);

  for (const key of ['id_token', 'refresh_token', 'token_type', 'expires_in', 'scope', 'state']) {
    const value = readParamFromUrl(window.location.href, key);
    if (value) callbackParams.set(key, value);
  }

  window.location.replace(`${NATIVE_AUTH_SCHEME}?${callbackParams.toString()}`);
  return true;
}

export async function initializeNativeAuthBridge() {
  if (!Capacitor.isNativePlatform()) return false;

  await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    handleNativeAuthUrl(url);
  });

  try {
    const launchUrl = await CapacitorApp.getLaunchUrl();
    if (launchUrl?.url) handleNativeAuthUrl(launchUrl.url);
  } catch (error) {
    console.warn('[Yardit Auth] Could not read native launch URL', error);
  }

  return true;
}