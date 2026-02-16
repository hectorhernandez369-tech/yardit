/**
 * Yardit Tier System v1 — Shared Business Logic
 */

/**
 * computeFreeWindow(now, timeZoneId)
 * Returns the start/end for Free weekend logic:
 * - Friday 12:00am to Sunday 11:59:59pm in the listing's local timezone
 * - If posted during the weekend, activate immediately but still expire Sunday 11:59pm
 */
export function computeFreeWindow(now, timeZoneId) {
  // Get local date parts in the listing timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value])
  );

  const localYear = parseInt(parts.year);
  const localMonth = parseInt(parts.month);
  const localDay = parseInt(parts.day);
  const localWeekday = parts.weekday; // "Mon","Tue",..."Sun"

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = weekdayMap[localWeekday];

  // Calculate days until Friday (5) and days since Friday
  let daysSinceFriday;
  if (dow >= 5) {
    daysSinceFriday = dow - 5; // Fri=0, Sat=1
  } else {
    daysSinceFriday = dow + 2; // Sun=2, Mon=3, ...
  }

  // Friday of this week (current or most recent)
  const fridayDate = new Date(localYear, localMonth - 1, localDay - daysSinceFriday);
  const sundayDate = new Date(localYear, localMonth - 1, localDay - daysSinceFriday + 2);

  // Build timezone-aware ISO strings for the window boundaries
  const fridayStart = buildLocalDateTime(fridayDate, "00:00:00", timeZoneId);
  const sundayEnd = buildLocalDateTime(sundayDate, "23:59:59", timeZoneId);

  const isCurrentlyWeekend = now >= fridayStart && now <= sundayEnd;

  return {
    startDateTime: fridayStart,
    endDateTime: sundayEnd,
    isCurrentlyWeekend,
    // If posted during weekend, activate immediately but still expire Sunday
    effectiveStart: isCurrentlyWeekend ? now : fridayStart,
    effectiveEnd: sundayEnd,
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
      activeDates: [],
    };
  }

  return {
    valid: true,
    error: null,
    activeDates: dates, // all 3 days are active
  };
}

/**
 * computePremiumDates(startDate, endDate, earlyVisibilityDays)
 * Validates exactly 5 consecutive days.
 * Splits the earliest X days as earlyVisibilityDates, remaining as activeDates.
 * earlyVisibilityDays must be 0–3.
 */
export function computePremiumDates(startDate, endDate, earlyVisibilityDays = 0) {
  const dates = getConsecutiveDates(startDate, endDate);

  if (dates.length !== 5) {
    return {
      valid: false,
      error: `Premium tier requires exactly 5 consecutive days. Got ${dates.length}.`,
      activeDates: [],
      earlyVisibilityDates: [],
    };
  }

  const clampedEarly = Math.max(0, Math.min(3, earlyVisibilityDays));

  const earlyVisibilityDates = dates.slice(0, clampedEarly);
  const activeDates = dates.slice(clampedEarly);

  return {
    valid: true,
    error: null,
    earlyVisibilityDates,
    activeDates,
  };
}

/**
 * enforcePhotoLimit(tier, photoUrls)
 * Returns the trimmed array and whether it was truncated.
 * Free: max 1, Featured: max 5, Premium: max 8.
 */
export function enforcePhotoLimit(tier, photoUrls = []) {
  const limits = {
    free: 1,
    featured: 5,
    premium: 8,
  };

  const max = limits[tier] ?? 1;
  const truncated = photoUrls.length > max;

  return {
    allowed: photoUrls.slice(0, max),
    max,
    truncated,
    removed: truncated ? photoUrls.length - max : 0,
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
      description: "Visible from zoom level 9+ (City View)",
    },
    featured: {
      label: "Featured",
      minZoom: 11,
      zoomLabel: "Neighborhood View",
      description: "Visible from zoom level 11+ (Neighborhood View)",
    },
    free: {
      label: "Free",
      minZoom: 13,
      zoomLabel: "Street/Neighborhood View",
      description: "Visible from zoom level 13+ (Street/Neighborhood View)",
    },
  };

  return tiers[tier] ?? tiers.free;
}

// ── Internal Helpers ────────────────────────────────────

/**
 * Returns an array of "YYYY-MM-DD" strings for each day from startDate to endDate inclusive.
 */
function getConsecutiveDates(startDate, endDate) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const dates = [];

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Builds a Date object representing a local time in a given timezone.
 */
function buildLocalDateTime(dateObj, timeStr, timeZoneId) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const isoString = `${year}-${month}-${day}T${timeStr}`;

  // Create a date in UTC, then adjust for the timezone offset
  const tempDate = new Date(isoString + "Z");
  const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = tempDate.toLocaleString("en-US", { timeZone: timeZoneId });
  const offsetMs = new Date(utcStr).getTime() - new Date(tzStr).getTime();

  return new Date(tempDate.getTime() + offsetMs);
}