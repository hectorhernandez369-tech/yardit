// Guest mode utilities — centralized session management

const GUEST_KEY = "yardit_guest_session_v1";

export const setGuestMode = () => {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({ isGuest: true, createdAt: Date.now() }));
  } catch {}
};

export const clearGuestMode = () => {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {}
};

export const isGuestMode = () => {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.isGuest === true;
  } catch {
    return false;
  }
};