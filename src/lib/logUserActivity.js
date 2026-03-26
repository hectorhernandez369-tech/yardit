import { base44 } from "@/api/base44Client";

const GUEST_SESSION_KEY = "yardit_guest_session_id_v1";

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function getGuestSessionId() {
  const existing = localStorage.getItem(GUEST_SESSION_KEY);
  if (existing) return existing;

  const nextId = crypto.randomUUID();
  localStorage.setItem(GUEST_SESSION_KEY, nextId);
  return nextId;
}

export async function logUserActivity(payload = {}) {
  const userId = payload.user_id || undefined;
  const guestSessionId = userId ? undefined : (payload.guest_session_id || getGuestSessionId());

  return base44.entities.UserActivityLog.create(cleanPayload({
    user_id: userId,
    guest_session_id: guestSessionId,
    event_type: payload.event_type,
    event_label: payload.event_label,
    target_type: payload.target_type,
    target_id: payload.target_id,
    source_page: payload.source_page || window.location.pathname,
    details_json: payload.details_json,
    before_value: payload.before_value,
    after_value: payload.after_value,
    lat: payload.lat,
    lng: payload.lng,
    created_at: payload.created_at || new Date().toISOString(),
  }));
}

export async function logUserActivityOncePerSession(sessionKey, payload = {}) {
  if (sessionStorage.getItem(sessionKey)) return null;
  sessionStorage.setItem(sessionKey, "1");
  return logUserActivity(payload);
}