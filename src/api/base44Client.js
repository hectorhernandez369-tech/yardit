import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { isNativeYarditApp } from '@/lib/runtimePlatform';

const { appId, token, functionsVersion } = appParams;
const NATIVE_HOSTED_APP_URL = 'https://yardit.base44.app';
const nativeApp = isNativeYarditApp();

console.log('AUTH_DEBUG base44Client:init', {
  appId,
  hasToken: !!token,
  functionsVersion,
  nativeApp,
});

// Web/PWA uses Base44's normal routing.
// The bundled Capacitor app runs from a local WebView origin, so native auth
// needs Yardit's published hosted origin for Base44's /login route.
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  requiresAuth: false,
  ...(nativeApp ? { appBaseUrl: NATIVE_HOSTED_APP_URL } : {})
});
