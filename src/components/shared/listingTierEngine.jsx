/**
 * Yardit Tier System v1 — Shared Business Logic (Timezone-safe)
 *
 * Key rule:
 * - "Date strings" like YYYY-MM-DD are treated as CALENDAR DAYS in the listing's local timezone.
 * - Never generate YYYY-MM-DD with toISOString().slice(0,10) (it can shift a day).
 */

/**
 * computeFreeWindow(now, timeZoneId)
 * Returns start/end for Free weekend logic:
 * - Friday 12:00am to Sunday 11:59:59pm in the listing's local timezone
 * - If posted before Sunday 6:00pm local during that weekend, activate immediately
 * - If posted after Sunday 6:00pm local, roll forward to next weekend
 */
export function computeFreeWindow(now, timeZoneId) {
  const local = getZonedParts(now, timeZoneId); // listing-local parts
  const localYMD = `${local.year}-${pad2(local.month)}-${pad2(local.day)}`;

  // Weekday mapping from Intl "short" weekday
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = weekdayMap[local.weekday];

  // Days since Friday (Fri=0, Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6)
  const daysSinceFriday = dow >= 5 ? dow - 5 : dow + 2;

  const currentFridayYMD = addDaysYMD(localYMD, -daysSinceFriday);
  const currentSundayYMD = addDaysYMD(currentFridayYMD, 2);

  const currentFridayStart = zonedDateTimeToUtcDate(currentFridayYMD, "00:00:00", timeZoneId);
  const currentSundayEnd = zonedDateTimeToUtcDate(currentSundayYMD, "23:59:59", timeZoneId);
  const sundayCutoff = zonedDateTimeToUtcDate(currentSundayYMD, "18:00:00", timeZoneId);

  const isBeforeSundayCutoffWeekend = now >= currentFridayStart && now < sundayCutoff;
  const shouldRollToNextWeekend = now >= sundayCutoff;

  const targetFridayYMD = shouldRollToNextWeekend ? addDaysYMD(currentFridayYMD, 7) : currentFridayYMD;
  const targetSundayYMD = addDaysYMD(targetFridayYMD, 2);

  const fridayStart = zonedDateTimeToUtcDate(targetFridayYMD, "00:00:00", timeZoneId);
  const sundayEnd = zonedDateTimeToUtcDate(targetSundayYMD, "23:59:59", timeZoneId);

  return {
    startDateTime: fridayStart,
    endDateTime: sundayEnd,
    isCurrentlyWeekend: isBeforeSundayCutoffWeekend,
    effectiveStart: isBeforeSundayCutoffWeekend ? now : fridayStart,
    effectiveEnd: sundayEnd
  };
}

/**
 * computeFeaturedDates(startDate, endDate)
 * Validates exactly 3 consecutive days and returns activeDates.
 * startDate/endDate are "YYYY-MM-DD" strings.
 */
export function computeFeaturedDates(startDate, endDate) {
  const dates = getConsecutiveDates(startDate, endDate);

  if (dates.length !== 3) {
    return {
      valid: false,
      error: `Featured tier requires exactly 3 consecutive days. Got ${dates.length}.`,
      activeDates: []
    };
  }

  return {
    valid: true,
    error: null,
    activeDates: dates
  };
}

/**
 * computePremiumDates(startDate, endDate, earlyVisibilityDays)
 * Validates exactly 5 consecutive days.
 * Splits earliest X days as earlyVisibilityDates, remaining as activeDates.
 * earlyVisibilityDays must be 0–3.
 */
export function computePremiumDates(startDate, endDate, earlyVisibilityDays = 0) {
  const dates = getConsecutiveDates(startDate, endDate);

  if (dates.length < 1 || dates.length > 5) {
    return {
      valid: false,
      error: `Premium tier allows 1 to 5 consecutive days. Got ${dates.length}.`,
      activeDates: [],
      earlyVisibilityDates: []
    };
  }

  const clampedEarly = Math.max(0, Math.min(3, Number(earlyVisibilityDays) || 0));

  const earlyVisibilityDates = [];
  if (clampedEarly > 0) {
    for (let i = clampedEarly; i > 0; i--) {
      earlyVisibilityDates.push(addDaysYMD(startDate, -i));
    }
  }

  const activeDates = dates;

  return {
    valid: true,
    error: null,
    earlyVisibilityDates,
    activeDates
  };
}

/**
 * enforcePhotoLimit(tier, photoUrls)
 * Returns the trimmed array and whether it was truncated.
 * Free: max 1, Featured: max 5, Premium: max 8.
 */
export function enforcePhotoLimit(tier, photoUrls = []) {
  const limits = { free: 1, featured: 5, premium: 8 };
  const max = limits[tier] ?? 1;

  const truncated = photoUrls.length > max;

  return {
    allowed: photoUrls.slice(0, max),
    max,
    truncated,
    removed: truncated ? photoUrls.length - max : 0
  };
}

/**
 * getTierZoomInfo(tier)
 * Returns labels and zoom thresholds for map visibility.
 * Premium: zoom 9+ (City View)
 * Featured: zoom 11+ (Neighborhood View)
 * Free: zoom 13+ (Street/Neighborhood View)
 */
export function getTierZoomInfo(tier) {
  const tiers = {
    premium: {
      label: "Premium",
      minZoom: 9,
      zoomLabel: "City View",
      description: "Visible from zoom level 9+ (City View)"
    },
    featured: {
      label: "Featured",
      minZoom: 11,
      zoomLabel: "Neighborhood View",
      description: "Visible from zoom level 11+ (Neighborhood View)"
    },
    free: {
      label: "Free",
      minZoom: 13,
      zoomLabel: "Street/Neighborhood View",
      description: "Visible from zoom level 13+ (Street/Neighborhood View)"
    }
  };

  return tiers[tier] ?? tiers.free;
}

// ─────────────────────────────────────────────────────────────
// Internal Helpers (timezone-safe)
// ─────────────────────────────────────────────────────────────

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Returns zoned parts for a Date in a given timezone using Intl.formatToParts()
 */
function getZonedParts(date, timeZoneId) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/**
 * Adds days to a YYYY-MM-DD string using UTC-safe math (no local timezone drift).
 */
function addDaysYMD(ymd, deltaDays) {
  const { y, m, d } = parseYMD(ymd);
  const ms = Date.UTC(y, m - 1, d + deltaDays);
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = pad2(dt.getUTCMonth() + 1);
  const dd = pad2(dt.getUTCDate());
  return `${yy}-${mm}-${dd}`;
}

function parseYMD(ymd) {
  const [ys, ms, ds] = String(ymd).split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) throw new Error(`Invalid YYYY-MM-DD date: ${ymd}`);
  return { y, m, d };
}

/**
 * Returns an array of YYYY-MM-DD for each day from startDate to endDate inclusive.
 * This is UTC-safe and never uses toISOString().
 */
function getConsecutiveDates(startDate, endDate) {
  const start = parseYMD(startDate);
  const end = parseYMD(endDate);

  const startMs = Date.UTC(start.y, start.m - 1, start.d);
  const endMs = Date.UTC(end.y, end.m - 1, end.d);

  if (endMs < startMs) return [];

  const dates = [];
  for (let ms = startMs; ms <= endMs; ms += 24 * 60 * 60 * 1000) {
    const dt = new Date(ms);
    const y = dt.getUTCFullYear();
    const m = pad2(dt.getUTCMonth() + 1);
    const d = pad2(dt.getUTCDate());
    dates.push(`${y}-${m}-${d}`);
    if (dates.length > 40) break; // safety
  }
  return dates;
}

/**
 * Convert a listing-local wall-clock time (YYYY-MM-DD + HH:mm:ss) into a real Date object.
 *
 * This avoids parsing toLocaleString() back into Date (unreliable).
 * It uses Intl.formatToParts() to measure the timezone offset and applies it.
 */
function zonedDateTimeToUtcDate(ymd, timeStr, timeZoneId) {
  const { y, m, d } = parseYMD(ymd);
  const [hh, mm, ss] = String(timeStr).split(":").map((n) => Number(n));

  // First guess: treat the wall time as UTC.
  let guess = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0));

  // Get offset for that guess in the target timezone, then adjust.
  // Do two passes to handle DST edges better.
  for (let i = 0; i < 2; i++) {
    const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZoneId);
    guess = new Date(guess.getTime() - offsetMinutes * 60 * 1000);
  }

  return guess;
}

/**
 * Returns the offset in minutes between UTC and the given timeZone at the provided Date instant.
 * Positive means the timezone is "behind" UTC (e.g., PST is +480 minutes).
 */
function getTimeZoneOffsetMinutes(date, timeZoneId) {
  const parts = getZonedParts(date, timeZoneId);

  // Interpret the formatted timezone parts as if they were UTC to compute the "asUTC" timestamp.
  const asUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  // Offset = (asUTC - actualUTC) in minutes
  return Math.round((asUtcMs - date.getTime()) / 60000);
}