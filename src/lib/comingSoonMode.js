export const COMING_SOON_SETTING_KEY = "coming_soon_mode";

export function isComingSoonModeEnabled(settings = []) {
  const record = settings.find((setting) => setting.key === COMING_SOON_SETTING_KEY);
  return record?.value === "true";
}

// ── Tester bypass (persistent localStorage token) ──────────────────────────────
const TESTER_BYPASS_KEY = "yardit_tester_bypass";

// Shared access codes testers use to bypass Coming Soon
export const TESTER_ACCESS_CODE = "Earlytestaccess";
export const TESTER_FULL_ACCESS_CODE = "Yardittestaccess";

export function getTesterBypass() {
  try {
    const raw = localStorage.getItem(TESTER_BYPASS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      localStorage.removeItem(TESTER_BYPASS_KEY);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(TESTER_BYPASS_KEY);
    return null;
  }
}

export function setTesterBypass({ noExpiration = false } = {}) {
  const data = {
    granted_at: new Date().toISOString(),
    expires_at: null,
    access_type: noExpiration ? "full_test" : "early_access",
  };
  localStorage.setItem(TESTER_BYPASS_KEY, JSON.stringify(data));
  return data;
}

export function clearTesterBypass() {
  localStorage.removeItem(TESTER_BYPASS_KEY);
}

export function shouldBypassComingSoonForCurrentUrl() {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const inviteParams = ["invite", "invite_id", "invitation", "invitation_id", "token", "signup", "sign_up", "auth"];

  return inviteParams.some((key) => url.searchParams.has(key));
}