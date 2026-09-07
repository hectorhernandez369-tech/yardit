export const HOLIDAY_MAP_PRIORITY_ENABLED = true;
export const HOLIDAY_MAP_PRIORITY_START_DATE = "2026-09-01";
export const HOLIDAY_MAP_PRIORITY_END_DATE = "2026-10-31";
export const HOLIDAY_PRIORITY_START_TIME = "17:00";
export const HOLIDAY_YARD_SALE_OPACITY = 0.35;

function pad(value) {
  return String(value).padStart(2, "0");
}

function getLocalDateAndMinutes(now, timeZoneId) {
  if (!timeZoneId) {
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      minutes: now.getHours() * 60 + now.getMinutes(),
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function isSeasonDate(date) {
  return date >= HOLIDAY_MAP_PRIORITY_START_DATE && date <= HOLIDAY_MAP_PRIORITY_END_DATE;
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

export function isHolidayMapPriorityActive(now = new Date()) {
  if (!HOLIDAY_MAP_PRIORITY_ENABLED) return false;
  return isSeasonDate(getLocalDateAndMinutes(now).date);
}

export function isYardSaleHolidayFaded(listing, now = new Date()) {
  if (!HOLIDAY_MAP_PRIORITY_ENABLED || listing?.listingType !== "yard_sale") return false;
  const local = getLocalDateAndMinutes(now, listing?.timeZoneId);
  return isSeasonDate(local.date) && local.minutes >= minutesFromTime(HOLIDAY_PRIORITY_START_TIME);
}

export function getHolidayYardSaleOpacity() {
  return HOLIDAY_YARD_SALE_OPACITY;
}