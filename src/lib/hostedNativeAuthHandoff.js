const CALLBACK_FLAG = 'yardit_native_auth';
const CALLBACK_SCHEME = 'yardit://auth-callback';
const STATE_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function readUrlParam(url, name) {
  const parsed = new URL(url);
  const direct = parsed.searchParams.get(name);
  if (direct) return direct;
  const hash = parsed.hash.slice(1);
  const query = hash.includes('?') ? hash.split('?').slice(1).join('?') : hash;
  return new URLSearchParams(query).get(name);
}

function showReturnScreen(targetUrl, failed) {
  const wrapper = document.createElement('main');
  const title = document.createElement('h1');
  const message = document.createElement('p');
  const link = document.createElement('a');

  title.textContent = failed ? 'Login could not be completed' : 'Returning to Yardit';
  message.textContent = failed ? 'Return to Yardit and try signing in again.' : 'Yardit should reopen automatically.';
  link.textContent = 'Return to Yardit';
  link.href = targetUrl;
  wrapper.style.cssText = 'min-height:100vh;display:grid;place-content:center;gap:16px;padding:24px;text-align:center;font-family:system-ui;background:#000;color:#fff';
  link.style.cssText = 'display:inline-block;padding:12px 18px;border-radius:10px;background:#F4A849;color:#2C4F4E;font-weight:700;text-decoration:none';
  wrapper.append(title, message, link);
  document.body.replaceChildren(wrapper);
}

export function handoffHostedNativeAuthCallback() {
  const current = new URL(window.location.href);
  if (current.searchParams.get(CALLBACK_FLAG) !== '1') return false;

  const state = current.searchParams.get('state') || '';
  const accessToken = readUrlParam(window.location.href, 'access_token');
  const validState = STATE_PATTERN.test(state);
  const callbackParams = new URLSearchParams();
  if (validState) callbackParams.set('state', state);

  if (accessToken && validState) callbackParams.set('access_token', accessToken);
  else callbackParams.set('error', validState ? 'login_not_completed' : 'invalid_login_state');

  const safeBrowserUrl = `/auth-callback?${CALLBACK_FLAG}=1${validState ? `&state=${encodeURIComponent(state)}` : ''}`;
  window.history.replaceState({}, document.title, safeBrowserUrl);

  const targetUrl = `${CALLBACK_SCHEME}#${callbackParams.toString()}`;
  showReturnScreen(targetUrl, !accessToken || !validState);
  window.location.replace(targetUrl);
  return true;
}