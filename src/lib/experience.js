export const EXPERIENCE_STORAGE_KEY = "yardit_default_experience_v1";
export const EXPERIENCE_INTENT_KEY = "yardit_pending_experience_v1";
export const EXPERIENCE_SELECTED_KEY = "yardit_has_selected_experience_v1";

export const RESIDENTIAL_EXPERIENCE = "yardit";
export const EVENTS_EXPERIENCE = "yardit_events";
export const EVENTS_EXPERIENCE_AVAILABLE = false;

export const YARDIT_EVENTS_LOGO_URL = "https://media.base44.com/images/public/690f554506edf795e5d84121/5dcef72ff_file_00000000e57871fd89e0184da4a0973f.png";
export const YARDIT_LOGO_URL = "https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png";

export function getPreferredExperience() {
  if (typeof window === "undefined") return RESIDENTIAL_EXPERIENCE;
  const stored = localStorage.getItem(EXPERIENCE_STORAGE_KEY);

  if (stored === EVENTS_EXPERIENCE && !EVENTS_EXPERIENCE_AVAILABLE) {
    localStorage.setItem(EXPERIENCE_STORAGE_KEY, RESIDENTIAL_EXPERIENCE);
    localStorage.removeItem(EXPERIENCE_INTENT_KEY);
    return RESIDENTIAL_EXPERIENCE;
  }

  return stored === EVENTS_EXPERIENCE ? EVENTS_EXPERIENCE : RESIDENTIAL_EXPERIENCE;
}

export function setPreferredExperience(experience) {
  if (typeof window === "undefined") return;
  const wantsEvents = experience === EVENTS_EXPERIENCE;
  const next = wantsEvents && EVENTS_EXPERIENCE_AVAILABLE ? EVENTS_EXPERIENCE : RESIDENTIAL_EXPERIENCE;
  localStorage.setItem(EXPERIENCE_STORAGE_KEY, next);
  localStorage.setItem(EXPERIENCE_SELECTED_KEY, "true");
  window.dispatchEvent(new CustomEvent("yardit:experience-changed", { detail: next }));
}

export function setPendingExperience(experience) {
  if (typeof window === "undefined") return;
  const wantsEvents = experience === EVENTS_EXPERIENCE;
  const next = wantsEvents && EVENTS_EXPERIENCE_AVAILABLE ? EVENTS_EXPERIENCE : RESIDENTIAL_EXPERIENCE;
  localStorage.setItem(EXPERIENCE_INTENT_KEY, next);
  setPreferredExperience(next);
}

export function hasSelectedExperience() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(EXPERIENCE_SELECTED_KEY) === "true" || !!localStorage.getItem(EXPERIENCE_STORAGE_KEY);
}

export function getExperienceHome(experience = getPreferredExperience()) {
  return experience === EVENTS_EXPERIENCE && EVENTS_EXPERIENCE_AVAILABLE ? "/VendorAccountIntro?experience=events" : "/";
}

export function isEventsShellPath(pathname = window.location.pathname) {
  return ["/VendorDashboard", "/LeagueTeamDashboard", "/VendorSignup", "/VendorSetup", "/VendorAccountIntro", "/VendorEventDashboard", "/VendorEventFlags", "/VendorEventSchedule"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
