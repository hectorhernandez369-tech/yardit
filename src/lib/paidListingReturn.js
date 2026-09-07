import { getResidentialEventPriceBreakdown } from "@/lib/eventListingConfig";
import { normalizeResidentialEventSingleDay } from "@/lib/residentialEventSchedule";
import { getStateAbbreviation } from "@/lib/listingLocation";
import { zonedDateTimeToUtcDate } from "@/components/shared/listingTierEngine";

export const PAID_LISTING_CHECKOUT_KEY = "yardit_paid_listing_checkout_v1";

function listingNumber(data) {
  const state = getStateAbbreviation(data.state || "XX");
  const zip = String(data.zip || "0000").slice(-4).padStart(4, "0");
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let index = 0; index < 5; index += 1) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${state}${zip}-${suffix}`;
}

function activeDates(start, end) {
  if (!start || !end) return [];
  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last && dates.length < 10) {
    const pad = (value) => String(value).padStart(2, "0");
    dates.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function loadPaidCheckout() {
  try {
    return JSON.parse(localStorage.getItem(PAID_LISTING_CHECKOUT_KEY) || "null");
  } catch {
    return null;
  }
}

export function buildPaidListingPayload(source, user, sessionId) {
  let data = normalizeResidentialEventSingleDay({ ...source });
  const common = {
    ...data,
    ownerUserId: user.id,
    listingNumber: listingNumber(data),
    pending_checkout_session_id: sessionId,
    payment_status: "pending",
    payment_intent_status: "hold_requested",
    pricePaid: 0,
    participant_origin: data.participant_origin || "standalone",
    neighborhood_join_status: data.neighborhood_join_status || "none",
  };

  if (data.listingType === "event") {
    return {
      ...common,
      title: data.event_name,
      description: data.event_description || "",
      category: data.event_category,
      tier: "event",
      event_tier: "event",
      photoUrls: data.event_photos || data.photoUrls || [],
      display_address: data.display_address || data.address_text || data.addressText,
      addressText: data.display_address || data.address_text || data.addressText,
      address_text: data.display_address || data.address_text || data.addressText,
      startDateTime: data.start_datetime ? new Date(data.start_datetime).toISOString() : data.startDateTime,
      endDateTime: data.end_datetime ? new Date(data.end_datetime).toISOString() : data.endDateTime,
      status: "active",
      pricePaid: Number(getResidentialEventPriceBreakdown(data).total || 0) / 100,
    };
  }

  const timezone = data.timeZoneId || "America/Los_Angeles";
  return {
    ...common,
    addressText: user.primary_address || user.street_address || data.addressText,
    city: user.city || data.city,
    state: getStateAbbreviation(user.state || data.state || ""),
    zip: user.zip_code || data.zip,
    lat: typeof data.lat === "number" ? data.lat : (user.primary_latitude ?? user.address_lat),
    lng: typeof data.lng === "number" ? data.lng : (user.primary_longitude ?? user.address_lng),
    timeZoneId: user.timeZoneId || timezone,
    locationMethod: "verified_primary_address",
    startDateTime: zonedDateTimeToUtcDate(data.selectedRangeStartDate, "05:00:00", timezone).toISOString(),
    endDateTime: zonedDateTimeToUtcDate(data.selectedRangeEndDate, "22:00:00", timezone).toISOString(),
    activeDates: activeDates(data.selectedRangeStartDate, data.selectedRangeEndDate),
    earlyVisibilityDays: data.tier === "premium" ? Math.max(0, Math.min(3, Number(data.earlyVisibilityDays || 0))) : 0,
    earlyVisibilityDates: data.tier === "premium" ? (data.earlyVisibilityDates || []) : [],
    status: "pending_payment",
  };
}