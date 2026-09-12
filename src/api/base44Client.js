import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

console.log('AUTH_DEBUG base44Client:init', {
  appId,
  hasToken: !!token,
  functionsVersion,
});

// Let the Base44 SDK use its own authentication/app routing.
// serverUrl remains available in appParams for explicit backend API calls,
// but must not override the SDK login destination.
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  requiresAuth: false
});