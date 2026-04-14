import tzLookup from "tz-lookup";

export const FALLBACK_TZ = "";

export function hasValidCoordinates(lat, lng) {
  return typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);
}

export function hasValidAddressFields(location) {
  return !!(
    location?.addressText?.trim() &&
    location?.city?.trim() &&
    location?.state?.trim() &&
    location?.zip?.trim()
  );
}

export function normalizeLocationFields(location = {}) {
  return {
    ...location,
    address_text: location.address_text || location.addressText || "",
    addressText: location.addressText || location.address_text || "",
    city: location.city || "",
    state: (location.state || "").toUpperCase().slice(0, 2),
    zip: location.zip || "",
  };
}

export function resolveTimeZoneFromCoordinates(lat, lng) {
  if (!hasValidCoordinates(lat, lng)) return FALLBACK_TZ;
  try {
    const timeZoneId = tzLookup(lat, lng);
    return typeof timeZoneId === "string" ? timeZoneId : FALLBACK_TZ;
  } catch {
    return FALLBACK_TZ;
  }
}

export function buildResolvedListingLocation(location = {}) {
  const normalized = normalizeLocationFields(location);
  return {
    ...normalized,
    timeZoneId: normalized.timeZoneId || resolveTimeZoneFromCoordinates(normalized.lat, normalized.lng) || FALLBACK_TZ,
  };
}

export function isLocationReadyForSubmission(location = {}) {
  const normalized = normalizeLocationFields(location);
  return hasValidAddressFields(normalized) && hasValidCoordinates(normalized.lat, normalized.lng);
}