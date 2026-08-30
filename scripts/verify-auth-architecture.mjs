import fs from 'node:fs';

const clientPath = 'src/api/base44Client.js';
const clientSource = fs.readFileSync(clientPath, 'utf8');
const createClientMatch = clientSource.match(/createClient\s*\(\s*\{([\s\S]*?)\}\s*\)/);

if (!createClientMatch) {
  throw new Error(`Auth guard: createClient({...}) was not found in ${clientPath}`);
}

if (/\b(?:serverUrl|appBaseUrl)\s*[:,]/.test(createClientMatch[1])) {
  throw new Error('Auth guard: serverUrl/appBaseUrl must never be passed to createClient()');
}

if (/appParams\.(?:serverUrl|appBaseUrl)|VITE_BASE44_BACKEND_URL/.test(clientSource)) {
  throw new Error('Auth guard: backend routing configuration must remain outside base44Client.js');
}

console.log('Auth architecture guard passed');