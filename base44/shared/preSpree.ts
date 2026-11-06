import { PRE_SPREE_CAMPAIGN, isPreSpreeEligible, preSpreeLocalParts, hasPreSpreeDates } from "./preSpreeRules.ts";

function utcForLocal(date, time, timeZoneId) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const parts = preSpreeLocalParts(new Date(guess), timeZoneId);
    guess += wall - Date.parse(`${parts.date}T${parts.time}:00Z`);
  }
  return new Date(guess).toISOString();
}

export function getPreSpreeSchedule(data) {
  if (!hasPreSpreeDates(data)) return { error: "Pre-Spree dates must stay within November 21–22, 2026." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.openTime || "") ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.closeTime || "") ||
      data.openTime < "05:00" || data.closeTime > "22:00" || data.openTime >= data.closeTime) {
    return { error: "Choose opening and closing times between 5 AM and 10 PM." };
  }
  if (!Array.isArray(data.photoUrls) || data.photoUrls.length > 10 || data.photoUrls.some(url => typeof url !== "string")) {
    return { error: "Featured includes up to 10 photos." };
  }
  const startDateTime = utcForLocal(data.selectedRangeStartDate, data.openTime, data.timeZoneId);
  const endDateTime = utcForLocal(data.selectedRangeEndDate, data.closeTime, data.timeZoneId);
  return { startDateTime, endDateTime };
}

export function preparePreSpreeListing(data, user, timeZoneId, now = new Date()) {
  const safe = { ...data, timeZoneId };
  if (!isPreSpreeEligible(safe, now)) return { error: "Pre-Spree is available for Featured yard sales on November 21–22, 2026 only." };
  if (data.ownerUserId && data.ownerUserId !== user.id) return { error: "Publish your Pre-Spree sale from your own account." };
  const lat = user.primary_latitude ?? user.address_lat;
  const lng = user.primary_longitude ?? user.address_lng;
  const verified = user.primary_address_verified === true || user.address_verified === true || user.address_confirmation_status === "confirmed";
  if (!verified || !Number.isFinite(lat) || !Number.isFinite(lng) ||
      !(user.primary_address || user.street_address) || !user.city || !user.state || !user.zip_code) {
    return { error: "Please confirm your home address before publishing." };
  }
  if (!String(data.title || "").trim()) return { error: "Please name your yard sale." };
  const schedule = getPreSpreeSchedule(safe);
  if (schedule.error) return schedule;
  const { startDateTime, endDateTime } = schedule;
  if (now >= new Date(endDateTime)) return { error: "This sale's closing time has passed." };
  const selectedLat = Number.isFinite(data.lat) ? data.lat : lat;
  const selectedLng = Number.isFinite(data.lng) ? data.lng : lng;
  const rad = Math.PI / 180;
  const a = Math.sin((selectedLat - lat) * rad / 2) ** 2 + Math.cos(lat * rad) * Math.cos(selectedLat * rad) * Math.sin((selectedLng - lng) * rad / 2) ** 2;
  if (20902231 * 2 * Math.asin(Math.min(1, Math.sqrt(a))) > 500) return { error: "Your sale must use your verified home address." };
  return { data: {
    ...safe, ownerUserId: user.id,
    addressText: user.primary_address || user.street_address, city: user.city, state: user.state, zip: user.zip_code,
    lat: selectedLat, lng: selectedLng, locationMethod: "verified_primary_address",
    pre_spree_campaign: PRE_SPREE_CAMPAIGN, pre_spree_published_at: now.toISOString(),
    pricePaid: 0, payment_status: "waived", payment_intent_status: "none",
    status: now < new Date(startDateTime) ? "scheduled" : "active",
    activation_status: now < new Date(startDateTime) ? "pending" : "active",
    startDateTime, endDateTime,
    activeDates: ["2026-11-21", "2026-11-22"].filter(date => date >= data.selectedRangeStartDate && date <= data.selectedRangeEndDate),
    earlyVisibilityDays: 0, earlyVisibilityDates: [], early_visibility_enabled: false,
    early_visibility_days: 0, visibility_start_date: "", early_visibility_promo_code: "",
    pending_checkout_session_id: "", stripe_checkout_session_id: "",
  } };
}
