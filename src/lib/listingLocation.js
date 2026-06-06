export const FALLBACK_TZ = "";

const TIME_ZONE_BOUNDS = [
  { zone: "Pacific/Honolulu", minLat: 18, maxLat: 23, minLng: -161, maxLng: -154 },
  { zone: "America/Anchorage", minLat: 51, maxLat: 72, minLng: -170, maxLng: -130 },
  { zone: "America/Los_Angeles", minLat: 32, maxLat: 49, minLng: -125, maxLng: -114 },
  { zone: "America/Denver", minLat: 31, maxLat: 49, minLng: -114, maxLng: -101 },
  { zone: "America/Chicago", minLat: 25, maxLat: 49, minLng: -101, maxLng: -86 },
  { zone: "America/New_York", minLat: 24, maxLat: 49, minLng: -86, maxLng: -66 },
];

function lookupApproximateTimeZone(lat, lng) {
  const match = TIME_ZONE_BOUNDS.find(({ minLat, maxLat, minLng, maxLng }) => (
    lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
  ));
  return match?.zone || FALLBACK_TZ;
}

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
  return STATE_MAP[cleaned] || "";
}

export function normalizeLocationFields(location = {}) {
  const displayAddress = location.display_address || location.address_text || location.addressText || "";
  return {
    ...location,
    display_address: displayAddress,
    geocoded_address: location.geocoded_address || "",
    location_source: location.location_source || "search",
    address_text: displayAddress,
    addressText: displayAddress,
    city: location.city || "",
    state: getStateAbbreviation(location.state),
    zip: location.zip || "",
  };
}

export function resolveTimeZoneFromCoordinates(lat, lng) {
  if (!hasValidCoordinates(lat, lng)) return FALLBACK_TZ;
  try {
    const timeZoneId = lookupApproximateTimeZone(lat, lng);
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