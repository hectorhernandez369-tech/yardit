/**
 * Vendor Event Promotion Rules
 * Controls how early a Vendor Event can appear as "Coming Soon" on the map.
 */

export const VENDOR_PROMOTION_RULES = {
  free:            { includedDays: 0,  maxDays: 0  },
  starter:         { includedDays: 7,  maxDays: 14 },
  pro:             { includedDays: 14, maxDays: 30 },
  growth:          { includedDays: 30, maxDays: 60 },
  event_organizer: { includedDays: 45, maxDays: 90 },
};

/** Return the promotion rule for a vendor tier key. */
export function getPromotionRule(tierKey) {
  return VENDOR_PROMOTION_RULES[tierKey] || VENDOR_PROMOTION_RULES.free;
}

/**
 * Given an event start date and a vendor tier, return the relevant dates.
 * All dates are Date objects.
 *
 * - earliestSelectableDate: the later of (today) and (start - maxDays). Never in the past.
 * - defaultComingSoonDate:  the later of (today) and (start - includedDays). Clamped so it
 *                           cannot equal or exceed the event start date.
 * - eventStartsToday:       true when the event starts today or in the past — no promo available.
 */
export function getPromotionDates(eventStartDate, tierKey) {
  const rule = getPromotionRule(tierKey);
  const start = new Date(eventStartDate);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);

  // Event starts today or has already started → no promotion window
  const eventStartsToday = startDay <= todayStart;

  // Raw included / max dates (may be in the past)
  const rawIncludedDate = new Date(startDay);
  rawIncludedDate.setDate(rawIncludedDate.getDate() - rule.includedDays);

  const rawEarliestDate = new Date(startDay);
  rawEarliestDate.setDate(rawEarliestDate.getDate() - rule.maxDays);

  // Clamp both to today (never show past dates in the UI)
  const includedDate = rawIncludedDate < todayStart ? new Date(todayStart) : rawIncludedDate;
  const earliestSelectableDate = rawEarliestDate < todayStart ? new Date(todayStart) : rawEarliestDate;

  // defaultComingSoonDate must be < event start
  const dayBeforeStart = new Date(startDay);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  const defaultComingSoonDate = includedDate > dayBeforeStart ? dayBeforeStart : includedDate;

  return {
    includedDate,          // clamped to today — use for UI display
    rawIncludedDate,       // raw (may be past) — use for upgrade threshold comparison
    earliestSelectableDate,
    defaultComingSoonDate,
    eventStartsToday,
    rule,
  };
}

/**
 * Calculate how many additional days beyond the included window the user selected,
 * and whether an upgrade is required.
 *
 * selectedDate  - the user-chosen (or auto-set) Coming Soon date
 * includedDate  - the raw (un-clamped) date representing the end of the included window
 *                 (eventStart - includedDays). Compare against this to detect upgrade need.
 */
export function calcPromotionUpgrade(selectedDate, includedDate) {
  if (!selectedDate || !includedDate) return { upgradeRequired: false, additionalDays: 0 };
  // Normalise both to midnight for a clean day-based comparison
  const sel = new Date(selectedDate); sel.setHours(0, 0, 0, 0);
  const inc = new Date(includedDate); inc.setHours(0, 0, 0, 0);
  if (sel >= inc) return { upgradeRequired: false, additionalDays: 0 };
  const msPerDay = 1000 * 60 * 60 * 24;
  const additionalDays = Math.ceil((inc - sel) / msPerDay);
  return { upgradeRequired: true, additionalDays };
}

/**
 * Shared helper: determine the visibility status for a Vendor Event.
 *
 * Priority:
 *  cancelled  → cancelled
 *  draft/pending_payment → keep as-is
 *  now < coming_soon_start_date (or no coming soon set) → scheduled
 *  coming_soon_start_date <= now < startDateTime → coming_soon
 *  startDateTime <= now <= endDateTime → active
 *  now > endDateTime → completed
 */
export function getVendorEventVisibilityStatus(event, now = new Date()) {
  if (!event) return "draft";

  if (["cancelled", "draft", "pending_payment"].includes(event.status)) return event.status;

  const start = new Date(event.startDateTime);
  const end   = new Date(event.endDateTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return event.status || "draft";

  if (now > end) return "completed";
  if (now >= start && now <= end) return "active";

  // Pre-start: check coming soon window
  if (event.coming_soon_start_date) {
    const comingSoonStart = new Date(event.coming_soon_start_date);
    if (!Number.isNaN(comingSoonStart.getTime()) && now >= comingSoonStart) {
      return "coming_soon";
    }
  }

  return "scheduled";
}

/**
 * Returns true if the event should be visible on map/list as Coming Soon.
 */
export function isVendorEventComingSoonVisible(event, now = new Date()) {
  if (!event) return false;
  if (!["published", "active"].includes(event.status)) return false;
  const status = getVendorEventVisibilityStatus(event, now);
  return status === "coming_soon";
}

/**
 * Returns true if two vendor events are at "the same location" (within ~50 feet).
 * 50 feet ≈ 0.0000152 degrees latitude.
 */
const SAME_LOCATION_THRESHOLD_FEET = 50;
const FEET_PER_DEGREE_LAT = 364000; // approx

export function areVendorEventsSameLocation(eventA, eventB) {
  const latA = Number(eventA?.latitude);
  const lngA = Number(eventA?.longitude);
  const latB = Number(eventB?.latitude);
  const lngB = Number(eventB?.longitude);
  if ([latA, lngA, latB, lngB].some(isNaN)) return false;

  const latDeg = Math.abs(latA - latB);
  const lngDeg = Math.abs(lngA - lngB);
  const latFt  = latDeg * FEET_PER_DEGREE_LAT;
  const cosLat = Math.cos((latA * Math.PI) / 180);
  const lngFt  = lngDeg * FEET_PER_DEGREE_LAT * cosLat;

  return Math.sqrt(latFt ** 2 + lngFt ** 2) <= SAME_LOCATION_THRESHOLD_FEET;
}

/**
 * Group vendor events by location (within threshold).
 * Returns an array of groups: [{ primary, stacked }].
 * primary = the event with highest priority (active > coming_soon > scheduled).
 * stacked = the rest at that location.
 */
const STATUS_PRIORITY = { active: 0, coming_soon: 1, scheduled: 2, upcoming: 2 };

export function groupVendorEventsByLocation(events, now = new Date()) {
  const enriched = events.map((e) => ({
    ...e,
    _visStatus: getVendorEventVisibilityStatus(e, now),
  }));

  const groups = [];
  const assigned = new Set();

  enriched.forEach((event) => {
    if (assigned.has(event.id)) return;

    const group = { primary: event, stacked: [] };
    assigned.add(event.id);

    enriched.forEach((other) => {
      if (assigned.has(other.id)) return;
      if (areVendorEventsSameLocation(event, other)) {
        group.stacked.push(other);
        assigned.add(other.id);
      }
    });

    // Sort all (primary + stacked) by priority to pick the best primary
    const all = [group.primary, ...group.stacked].sort((a, b) => {
      const pa = STATUS_PRIORITY[a._visStatus] ?? 3;
      const pb = STATUS_PRIORITY[b._visStatus] ?? 3;
      if (pa !== pb) return pa - pb;
      // tie-break: soonest starting event
      return new Date(a.startDateTime) - new Date(b.startDateTime);
    });

    group.primary = all[0];
    group.stacked = all.slice(1);
    groups.push(group);
  });

  return groups;
}