export const TERMS_VERSION = "2026-06-03";
export const PRIVACY_VERSION = "2026-06-03";
export const COMMUNITY_GUIDELINES_VERSION = "2026-06-28";

export function hasConfirmedAddress(user) {
  if (!user) return false;

  const flagSet = user.primary_address_verified === true || user.address_confirmation_status === "confirmed";
  const street = String(user.street_address || "").trim();
  const city = String(user.city || "").trim();
  const state = String(user.state || "").trim();
  const zip = String(user.zip_code || "").trim();
  const lat = user.primary_latitude ?? user.address_lat;
  const lng = user.primary_longitude ?? user.address_lng;

  return Boolean(flagSet && street && city && state && zip && typeof lat === "number" && typeof lng === "number");
}

export function isAccountSetupComplete(user) {
  if (!user) return false;

  return Boolean(
    user.first_name?.trim() &&
    user.last_name?.trim() &&
    user.terms_accepted === true &&
    user.terms_version === TERMS_VERSION &&
    user.privacy_accepted === true &&
    user.privacy_version === PRIVACY_VERSION &&
    user.community_guidelines_accepted === true &&
    user.community_guidelines_version === COMMUNITY_GUIDELINES_VERSION &&
    hasConfirmedAddress(user)
  );
}

export function getProfileCompletionPercent(user) {
  if (!user) return 0;

  const items = [
    Boolean(user.first_name?.trim() && user.last_name?.trim()),
    Boolean(user.terms_accepted && user.privacy_accepted && user.community_guidelines_accepted),
    Boolean(user.phone?.trim()),
    hasConfirmedAddress(user),
    Boolean(user.profile_photo_url),
  ];

  const completed = items.filter(Boolean).length;
  return Math.round((completed / items.length) * 100);
}