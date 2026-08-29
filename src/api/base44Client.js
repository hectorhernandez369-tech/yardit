import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

console.log('AUTH_DEBUG base44Client:init', {
  appId,
  serverUrl,
  hasToken: !!token,
  functionsVersion,
});

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});