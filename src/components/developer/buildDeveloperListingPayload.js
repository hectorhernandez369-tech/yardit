import { buildResolvedListingLocation } from "@/lib/listingLocation";
import { zonedDateTimeToUtcDate } from "@/components/shared/listingTierEngine";

export default function buildDeveloperListingPayload(source) {
  const location = source.listingType === "event" ? source : { ...source, display_address: source.addressText, address_text: source.addressText };
  const data = buildResolvedListingLocation({ ...location });
  const event = data.listingType === "event";
  const halloween = data.listingType === "halloween_spot";
  const neighborhood = data.listingType === "neighborhood_sale";
  const title = String(event ? data.event_name || data.title || "" : data.title || "").trim();
  if (!title) throw new Error("Add a listing title before publishing. You can still preview any step.");
  if (![data.lat, data.lng].every((value) => typeof value === "number" && Number.isFinite(value)) || !data.addressText || !data.city || !data.state || !data.zip || !data.timeZoneId) {
    throw new Error("Choose a map location with an address before publishing; no profile verification is required.");
  }
  const startDay = event ? data.event_start_date : halloween ? data.halloween_start_date : data.selectedRangeStartDate;
  const endDay = event ? data.event_end_date : halloween ? data.halloween_end_date : data.selectedRangeEndDate;
  const open = event ? data.event_start_time : halloween ? data.halloween_start_time : data.openTime;
  const close = event ? data.event_end_time : halloween ? data.halloween_end_time : data.closeTime;
  const dateValid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
  const timeValid = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");
  if (!dateValid(startDay) || !dateValid(endDay) || !timeValid(open) || !timeValid(close)) throw new Error("Enter valid start/end dates and times before publishing.");
  if (endDay < startDay || ((!event || startDay === endDay) && close <= open)) throw new Error("The closing date and time must follow the opening date and time.");
  const startDateTime = zonedDateTimeToUtcDate(startDay, `${open}:00`, data.timeZoneId).toISOString();
  const endDateTime = zonedDateTimeToUtcDate(endDay, `${close}:00`, data.timeZoneId).toISOString();
  const earlyDays = data.tier === "premium" ? Math.max(0, Math.floor(Number(data.earlyVisibilityDays) || 0)) : 0;
  const visibility = new Date(`${startDay}T12:00:00Z`);
  visibility.setUTCDate(visibility.getUTCDate() - earlyDays);
  return {
    ...data, title,
    description: event ? data.event_description || "" : data.description || "",
    category: event ? data.event_category || "Community Event" : neighborhood ? "Neighborhood Sale" : data.category || data.categories?.[0] || "Miscellaneous",
    tier: event ? "event" : neighborhood ? "neighborhood_tier" : data.tier || "free",
    photoUrls: event ? data.event_photos || data.photoUrls || [] : data.photoUrls || [],
    selectedRangeStartDate: startDay, selectedRangeEndDate: endDay,
    openTime: open, closeTime: close, startDateTime, endDateTime,
    activeDates: [], earlyVisibilityDates: [], earlyVisibilityDays: earlyDays,
    early_visibility_enabled: earlyDays > 0,
    early_visibility_days: earlyDays,
    visibility_start_date: earlyDays > 0 ? visibility.toISOString().slice(0, 10) : "",
    ...(event ? { event_tier: "event", start_datetime: startDateTime, end_datetime: endDateTime } : {}),
    ...(neighborhood ? { invite_code: data.invite_code || data.neighborhoodDraftId || crypto.randomUUID() } : {}),
  };
}