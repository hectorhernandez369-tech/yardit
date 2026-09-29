export function normalizeResidentialRelistTier(value) {
  if (["free", "featured", "premium"].includes(value)) return value;
  return "";
}
export function getRequestedStep(search) {
  const params = new URLSearchParams(search);
  if (params.get("relist") === "1" || params.get("rescueToken") || params.get("payment") || params.get("neighborhoodSetup")) return null;
  const requestedStep = Number(params.get("step"));
  return [1, 2, 3, 4].includes(requestedStep) ? requestedStep : null;
}
export function getDistanceFeet(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 20902231;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const DEV_BYPASS_USER_IDS = ["PUT_YOUR_USER_ID_HERE"];
export function isDevBypassUser(user) {
  return !!user?.id && DEV_BYPASS_USER_IDS.includes(user.id);
}
export function minutesFromTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}
export function getOpenHoursError(data) {
  const openMinutes = minutesFromTime(data.openTime);
  const closeMinutes = minutesFromTime(data.closeTime);
  const earliest = 5 * 60;
  const latest = 22 * 60;
  if (openMinutes === null) return "Please select an open time";
  if (closeMinutes === null) return "Please select a close time";
  if (openMinutes < earliest) return "Open Time cannot be earlier than 5:00 AM";
  if (closeMinutes > latest) return "Close Time cannot be later than 10:00 PM";
  if (openMinutes >= closeMinutes) return "Open Time must be before Close Time";
  return "";
}
export function getTodayYmd() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
export function localYmdFromIso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function hasPastSelectedDates(data) {
  const today = getTodayYmd();
  return Boolean((data?.selectedRangeStartDate && data.selectedRangeStartDate < today) ||
    (data?.selectedRangeEndDate && data.selectedRangeEndDate < today));
}
export function hasListingDraftContent(data) {
  if (data?.listingType === "halloween_spot") {
    return Boolean(data.title || data.description || data.addressText || data.halloween_start_date ||
      data.halloween_start_time || data.halloween_spot_type || data.photoUrls?.length || data.halloween_tags?.length);
  }
  if (data?.listingType === "event") {
    return Boolean(data.event_name || data.event_description || data.event_category || data.display_address ||
      data.address_text || data.event_start_date || data.event_start_time || Object.keys(data.event_add_ons || {}).length);
  }
  if (!["yard_sale", "neighborhood_sale"].includes(data?.listingType)) return false;
  return Boolean(data.title || data.description || data.addressText || data.selectedRangeStartDate ||
    data.selectedRangeEndDate || data.categories?.length || data.category);
}