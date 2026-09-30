import { getVendorTierConfig } from "@/lib/vendorTiers";
import { getVendorTierUsage, getVendorUsageLimitStatus, getVendorUsageSnapshot } from "@/lib/vendorUsage";
import { getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";

export const VENDOR_EVENT_TYPES = [
  { value: "single", label: "Single Event" },
  { value: "multi_spot", label: "Multi-Field Event" },
  { value: "multi_location", label: "Multi-Location Event" },
];

export const VENDOR_EVENT_OVERAGE_PRICES = {
  single: null,
  multi_spot: null,
  multi_location: null,
};

export function getVendorEventBucket(eventType) {
  return eventType === "single" ? "single" : "multifield";
}

export function getVendorMonthlyEventUsage(events = [], accountId, monthDate = new Date(), excludeEventId = null) {
  const usage = getVendorTierUsage({ account: { id: accountId }, events, monthDate, excludeEventId });
  return {
    single: usage.singleEvents,
    multifield: usage.multiFieldEvents,
    multi_spot: usage.multiSpotEvents,
    multi_location: usage.multiLocationEvents,
  };
}

export function getVendorEventPermission({ account, events = [], eventType = "single", startDateTime, excludeEventId = null }) {
  const credits = {
    single: Math.max(0, Number(account?.single_event_credits || 0)),
    multi_spot: Math.max(0, Number(account?.multi_spot_event_credits || 0)),
    multi_location: Math.max(0, Number(account?.multi_location_event_credits || 0)),
  };
  const available = credits[eventType] || 0;
  return {
    allowed: available > 0,
    usage: getVendorMonthlyEventUsage(events, account?.id, startDateTime ? new Date(startDateTime) : new Date(), excludeEventId),
    limit: available,
    typeLimit: available,
    bucket: getVendorEventBucket(eventType),
    reason: available > 0 ? "" : "Vendor subscriptions do not include event creation. Purchase an Event Add-on to create this event.",
    overagePrice: VENDOR_EVENT_OVERAGE_PRICES[eventType],
    eventCredits: credits,
  };
}

export function calculateMiles(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((value) => value === null || value === undefined || Number.isNaN(Number(value)))) return null;
  const radius = 3958.8;
  const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
  const dLng = (Number(lng2) - Number(lng1)) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(Number(lat1) * Math.PI / 180) * Math.cos(Number(lat2) * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function getVendorEventStatus(event, now = new Date()) {
  // Delegate to the shared visibility status helper for consistent logic
  const visStatus = getVendorEventVisibilityStatus(event, now);
  // Map coming_soon / scheduled → "upcoming" for backwards compatibility with existing card UI
  if (visStatus === "coming_soon") return "coming_soon";
  if (visStatus === "scheduled") return "upcoming";
  return visStatus;
}

/**
 * Dashboard-specific status for Dashboard → My Events → Active tab.
 *
 * Unlike getVendorEventVisibilityStatus(), this does NOT use coming_soon_start_date
 * or pending_payment. Any non-draft/non-cancelled event with a future startDateTime
 * is "coming_soon". An event that has started but not ended is "active".
 */
export function getDashboardEventStatus(event, now = new Date()) {
  if (!event) return "draft";

  if (event.status === "cancelled") return "cancelled";
  if (event.status === "draft") return "draft";

  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return event.status || "draft";
  }

  if (now > end) {
    return "completed";
  }

  if (now < start) {
    return "coming_soon";
  }

  return "active";
}

export function formatVendorEventType(type) {
  return VENDOR_EVENT_TYPES.find((item) => item.value === type)?.label || "Vendor Event";
}

export function toVendorEventListing(event, now = new Date()) {
  const visStatus = getVendorEventVisibilityStatus(event, now);
  const isComingSoon = visStatus === "coming_soon";
  return {
    id: `vendor-event-${event.id}`,
    vendor_event_id: event.id,
    title: event.title,
    event_name: event.title,
    description: event.description,
    listingType: "event",
    is_vendor_event: true,
    is_coming_soon: isComingSoon,
    vendor_visibility_status: visStatus,
    event_category: event.category || formatVendorEventType(event.event_type),
    event_tier: isComingSoon ? "basic" : "featured",
    tier: isComingSoon ? "basic" : "featured",
    status: isComingSoon ? "coming_soon" : "active",
    lat: event.latitude,
    lng: event.longitude,
    display_address: event.display_address,
    addressText: event.display_address,
    city: event.display_address,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    coming_soon_start_date: event.coming_soon_start_date,
    timeZoneId: event.timeZoneId || "America/Los_Angeles",
    photoUrls: event.photos || [],
    open_to_vendors: event.open_to_vendors,
  };
}

export function isPublishedVendorEvent(event, now = new Date()) {
  if (!event || !["published", "active"].includes(event.status)) return false;
  if (typeof event.latitude !== "number" || typeof event.longitude !== "number") return false;
  const end = new Date(event.endDateTime);
  if (Number.isNaN(end.getTime()) || now > end) return false;
  // Include coming_soon events in the visible set
  const visStatus = getVendorEventVisibilityStatus(event, now);
  return ["active", "coming_soon"].includes(visStatus);
}

export function getVendorTierDowngradeIssues({ account, targetTierKey, activePins = [], activeUsers = [] }) {
  const targetAccount = { ...account, vendor_tier: targetTierKey, extra_pins_count: 0, extra_users_count: 0 };
  const tier = getVendorTierConfig(targetTierKey);
  const snapshot = getVendorUsageSnapshot({ account: targetAccount, events: [], pins: activePins, users: activeUsers });
  const issues = [];

  if (snapshot.used.pins > snapshot.allowed.pins) {
    issues.push(`${tier.label} includes ${snapshot.allowed.pins} active pin${snapshot.allowed.pins === 1 ? "" : "s"}.`);
  }
  if (snapshot.used.users > snapshot.allowed.users) {
    issues.push(`${tier.label} includes ${snapshot.allowed.users} authorized user${snapshot.allowed.users === 1 ? "" : "s"}.`);
  }
  return { allowed: issues.length === 0, issues };
}
