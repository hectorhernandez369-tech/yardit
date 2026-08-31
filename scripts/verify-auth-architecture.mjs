import fs from 'node:fs';

const clientPath = 'src/api/base44Client.js';
const clientSource = fs.readFileSync(clientPath, 'utf8');
const createClientMatch = clientSource.match(/createClient\s*\(\s*\{([\s\S]*?)\}\s*\)/);

if (!createClientMatch) {
  throw new Error(`Auth guard: createClient({...}) was not found in ${clientPath}`);
}

if (/\bserverUrl\s*[:,]/.test(createClientMatch[1])) {
  throw new Error('Auth guard: serverUrl must never be passed to createClient()');
}

if (/appParams\.(?:serverUrl|appBaseUrl)|VITE_BASE44_BACKEND_URL/.test(clientSource)) {
  throw new Error('Auth guard: backend routing configuration must remain outside base44Client.js');
}

if (clientSource.includes('https://base44.app')) {
  throw new Error('Auth guard: generic Base44 backend origin must never be used as the Yardit login origin');
}

const usesAppBaseUrl = /\bappBaseUrl\s*:/.test(createClientMatch[1]);
if (usesAppBaseUrl) {
  if (!clientSource.includes("const NATIVE_HOSTED_APP_URL = 'https://yardit.base44.app'")) {
    throw new Error('Auth guard: native appBaseUrl must be Yardit\'s published hosted origin');
  }
  if (!/nativeApp\s*\?\s*\{\s*appBaseUrl\s*:\s*NATIVE_HOSTED_APP_URL\s*\}/.test(createClientMatch[1])) {
    throw new Error('Auth guard: appBaseUrl may only be applied conditionally to the native Capacitor runtime');
  }
}

const forbiddenAuthPatterns = [
  ['src/lib/AuthContext.jsx', /nativeAuthBridge|openNativeLogin|native_deep_link_handoff/],
  ['src/main.jsx', /hostedNativeAuthHandoff|nativeAuthBridge|NativeAuthStart/],
  ['src/App.jsx', /native-auth-start|NativeAuthStart/],
  ['android/app/src/main/AndroidManifest.xml', /yardit[^\n]*auth-callback/],
];

for (const [filePath, pattern] of forbiddenAuthPatterns) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (pattern.test(source)) throw new Error(`Auth guard: legacy native token handoff remains in ${filePath}`);
}

console.log('Auth architecture guard passed');
