import { getVendorTierConfig } from "@/lib/vendorTiers";
import { getVendorTierUsage, getVendorUsageLimitStatus, getVendorUsageSnapshot } from "@/lib/vendorUsage";

export const VENDOR_EVENT_TYPES = [
  { value: "single", label: "Single Event" },
  { value: "multi_spot", label: "Multi-Spot Event" },
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
  const tier = getVendorTierConfig(account?.vendor_tier);
  const status = getVendorUsageLimitStatus({
    account,
    events,
    monthDate: startDateTime ? new Date(startDateTime) : new Date(),
    excludeEventId,
  });
  const bucket = getVendorEventBucket(eventType);

  if (bucket === "single") {
    const limit = status.allowed.singleEvents;
    const allowed = status.canCreateSingleEvent;
    return {
      allowed,
      usage: {
        single: status.used.singleEvents,
        multifield: status.used.multiFieldEvents,
        multi_spot: status.used.multiSpotEvents,
        multi_location: status.used.multiLocationEvents,
      },
      limit,
      bucket,
      reason: allowed ? "" : `${tier.label} includes ${limit} Single Event${limit === 1 ? "" : "s"} per month. Upgrade or wait until next month to create another Single Event.`,
      overagePrice: VENDOR_EVENT_OVERAGE_PRICES.single,
    };
  }

  const limit = status.allowed.multiFieldEvents;
  const typeLimit = eventType === "multi_location" ? status.allowed.multiLocationEvents : status.allowed.multiSpotEvents;
  const typeUsage = eventType === "multi_location" ? status.used.multiLocationEvents : status.used.multiSpotEvents;
  const allowed = eventType === "multi_location" ? status.canCreateMultiLocationEvent : status.canCreateMultiSpotEvent;
  return {
    allowed,
    usage: {
      single: status.used.singleEvents,
      multifield: status.used.multiFieldEvents,
      multi_spot: status.used.multiSpotEvents,
      multi_location: status.used.multiLocationEvents,
    },
    limit,
    typeLimit,
    bucket,
    reason: allowed ? "" : limit === 0
      ? `${tier.label} does not include Multi-Spot or Multi-Location Events. Upgrade to Pro or higher.`
      : typeUsage >= typeLimit
        ? `${tier.label} includes ${typeLimit} ${formatVendorEventType(eventType)}${typeLimit === 1 ? "" : "s"} per month. Upgrade or wait until next month to create another one.`
        : `${tier.label} includes ${limit} Multi-Field Event${limit === 1 ? "" : "s"} per month. Upgrade or wait until next month to create another Multi-Field Event.`,
    overagePrice: VENDOR_EVENT_OVERAGE_PRICES[eventType],
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
  if (["draft", "pending_payment", "cancelled", "completed"].includes(event?.status)) return event.status;
  const start = new Date(event?.startDateTime);
  const end = new Date(event?.endDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return event?.status || "draft";
  if (now > end) return "completed";
  if (now >= start && now <= end) return "active";
  return event?.status === "published" ? "upcoming" : event?.status || "upcoming";
}

export function formatVendorEventType(type) {
  return VENDOR_EVENT_TYPES.find((item) => item.value === type)?.label || "Vendor Event";
}

export function toVendorEventListing(event) {
  return {
    id: `vendor-event-${event.id}`,
    vendor_event_id: event.id,
    title: event.title,
    event_name: event.title,
    description: event.description,
    listingType: "event",
    is_vendor_event: true,
    event_category: event.category || formatVendorEventType(event.event_type),
    event_tier: "featured",
    tier: "featured",
    status: "active",
    lat: event.latitude,
    lng: event.longitude,
    display_address: event.display_address,
    addressText: event.display_address,
    city: event.display_address,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    timeZoneId: event.timeZoneId || "America/Los_Angeles",
    photoUrls: event.photos || [],
    open_to_vendors: event.open_to_vendors,
  };
}

export function isPublishedVendorEvent(event, now = new Date()) {
  if (!event || !["published", "active"].includes(event.status)) return false;
  if (typeof event.latitude !== "number" || typeof event.longitude !== "number") return false;
  const end = new Date(event.endDateTime);
  return !Number.isNaN(end.getTime()) && now <= end;
}

export function getVendorTierDowngradeIssues({ account, events = [], targetTierKey, activePins = [], activeUsers = [] }) {
  const targetAccount = { ...account, vendor_tier: targetTierKey, extra_pins_count: 0, extra_users_count: 0 };
  const tier = getVendorTierConfig(targetTierKey);
  const snapshot = getVendorUsageSnapshot({ account: targetAccount, events, pins: activePins, users: activeUsers });
  const issues = [];

  if (snapshot.used.pins > snapshot.allowed.pins) {
    issues.push(`${tier.label} includes ${snapshot.allowed.pins} active pin${snapshot.allowed.pins === 1 ? "" : "s"}.`);
  }

  if (snapshot.used.users > snapshot.allowed.users) {
    issues.push(`${tier.label} includes ${snapshot.allowed.users} authorized user${snapshot.allowed.users === 1 ? "" : "s"}.`);
  }

  if (snapshot.used.singleEvents > snapshot.allowed.singleEvents) {
    issues.push(`${tier.label} includes ${snapshot.allowed.singleEvents} Single Event${snapshot.allowed.singleEvents === 1 ? "" : "s"} per month.`);
  }

  if (snapshot.used.multiSpotEvents > snapshot.allowed.multiSpotEvents) {
    issues.push(`${tier.label} includes ${snapshot.allowed.multiSpotEvents} Multi-Spot Event${snapshot.allowed.multiSpotEvents === 1 ? "" : "s"} per month.`);
  }

  if (snapshot.used.multiLocationEvents > snapshot.allowed.multiLocationEvents) {
    issues.push(`${tier.label} includes ${snapshot.allowed.multiLocationEvents} Multi-Location Event${snapshot.allowed.multiLocationEvents === 1 ? "" : "s"} per month.`);
  }

  if (snapshot.used.multiFieldEvents > snapshot.allowed.multiFieldEvents) {
    issues.push(`${tier.label} includes ${snapshot.allowed.multiFieldEvents} total Multi-Field Event${snapshot.allowed.multiFieldEvents === 1 ? "" : "s"} per month.`);
  }

  return { allowed: issues.length === 0, issues };
}