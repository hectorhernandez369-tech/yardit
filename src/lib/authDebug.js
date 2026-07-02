const AUTH_DEBUG_EVENTS_KEY = 'yardit_auth_debug_events_v1';
const MAX_EVENTS = 80;

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const redactValue = (value) => {
  if (typeof value !== 'string') return value;
  if (value.length <= 10) return value ? '[present]' : '';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
};

const sanitizeDetails = (details = {}) => {
  const sanitized = {};
  Object.entries(details || {}).forEach(([key, value]) => {
    if (/token|secret|authorization/i.test(key)) {
      sanitized[key] = value ? redactValue(String(value)) : value;
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
};

export const recordAuthDebugEvent = (type, details = {}) => {
  if (typeof window === 'undefined') return;

  try {
    const existing = safeJsonParse(localStorage.getItem(AUTH_DEBUG_EVENTS_KEY), []);
    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      type,
      path: window.location.pathname,
      hasSearch: Boolean(window.location.search),
      hasHash: Boolean(window.location.hash),
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
      details: sanitizeDetails(details),
    };

    localStorage.setItem(AUTH_DEBUG_EVENTS_KEY, JSON.stringify([...existing, event].slice(-MAX_EVENTS)));
  } catch {}
};

export const getAuthDebugEvents = () => {
  if (typeof window === 'undefined') return [];
  return safeJsonParse(localStorage.getItem(AUTH_DEBUG_EVENTS_KEY), []);
};

export const clearAuthDebugEvents = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_DEBUG_EVENTS_KEY);
  } catch {}
};