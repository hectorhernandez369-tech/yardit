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

const STATE_MAP = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC", "puerto rico": "PR"
};

export function getStateAbbreviation(stateName) {
  if (!stateName) return "";
  const cleaned = String(stateName).trim().toLowerCase();
  if (cleaned.length === 2) return cleaned.toUpperCase();
  return STATE_MAP[cleaned] || cleaned.slice(0, 2).toUpperCase();
}

export function normalizeLocationFields(location = {}) {
  return {
    ...location,
    address_text: location.address_text || location.addressText || "",
    addressText: location.addressText || location.address_text || "",
    city: location.city || "",
    state: getStateAbbreviation(location.state),
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