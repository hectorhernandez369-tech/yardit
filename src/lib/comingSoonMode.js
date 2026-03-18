export const COMING_SOON_SETTING_KEY = "coming_soon_mode";

export function isComingSoonModeEnabled(settings = []) {
  const record = settings.find((setting) => setting.key === COMING_SOON_SETTING_KEY);
  return record?.value === "true";
}