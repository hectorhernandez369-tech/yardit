import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const BASE44_ACCESS_TOKEN_KEY = 'base44_access_token';
const NATIVE_AUTH_SCHEME = 'yardit://auth-callback';

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
    return false;
  }

  try {
    localStorage.setItem(BASE44_ACCESS_TOKEN_KEY, accessToken);
  } catch (error) {
    console.error('[Yardit Auth] Could not save native login token', error);
    return false;
  }

  // Reload the bundled Yardit app so Base44 initializes with the newly saved token.
  window.location.replace('/');
  return true;
}

export function getNativeLoginReturnUrl() {
  return 'https://yardit.app/?yardit_native_auth=1';
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
