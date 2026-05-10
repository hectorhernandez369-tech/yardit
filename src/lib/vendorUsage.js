import { getVendorTierConfig } from "@/lib/vendorTiers";

export const COUNTED_VENDOR_EVENT_STATUSES = ["draft", "pending_payment", "published", "active"];

export function isVendorUsageEventActive(event, monthDate = new Date()) {
  if (!event?.startDateTime) return false;
  if (!COUNTED_VENDOR_EVENT_STATUSES.includes(event.status || "draft")) return false;

  const eventDate = new Date(event.startDateTime);
  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth();
}

export function getVendorTierAllowance(account) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  const allowAddOns = (account?.vendor_tier || "free") !== "free";

  return {
    singleEvents: Number(tier.included_single_events || 0),
    multiSpotEvents: Number(tier.included_multi_spot_events || 0),
    multiLocationEvents: Number(tier.included_multi_location_events || 0),
    multiFieldEvents: Number(tier.included_multifield_events || 0),
    pins: Number(tier.includedPins || 0) + (allowAddOns ? Number(account?.extra_pins_count || 0) : 0),
    users: Number(tier.includedUsers || 0) + (allowAddOns ? Number(account?.extra_users_count || 0) : 0),
  };
}

export function getVendorTierUsage({ account, events = [], pins = [], users = [], monthDate = new Date(), excludeEventId = null }) {
  const accountId = account?.id;
  const activeEvents = (events || []).filter((event) =>
    event.organizer_business_id === accountId &&
    event.id !== excludeEventId &&
    isVendorUsageEventActive(event, monthDate)
  );

  const activePins = (pins || []).filter((pin) => pin.is_active === true);
  const activeUsers = (users || []).filter((user) => user.status === "active");

  const singleEvents = activeEvents.filter((event) => event.event_type === "single").length;
  const multiSpotEvents = activeEvents.filter((event) => event.event_type === "multi_spot").length;
  const multiLocationEvents = activeEvents.filter((event) => event.event_type === "multi_location").length;

  return {
    singleEvents,
    multiSpotEvents,
    multiLocationEvents,
    multiFieldEvents: multiSpotEvents + multiLocationEvents,
    pins: activePins.length,
    users: activeUsers.length,
  };
}

export function getVendorUsageSnapshot({ account, events = [], pins = [], users = [], monthDate = new Date(), excludeEventId = null }) {
  return {
    used: getVendorTierUsage({ account, events, pins, users, monthDate, excludeEventId }),
    allowed: getVendorTierAllowance(account),
  };
}

export function getVendorUsageLimitStatus({ account, events = [], pins = [], users = [], monthDate = new Date(), excludeEventId = null }) {
  const snapshot = getVendorUsageSnapshot({ account, events, pins, users, monthDate, excludeEventId });
  return {
    ...snapshot,
    canCreateSingleEvent: snapshot.used.singleEvents < snapshot.allowed.singleEvents,
    canCreateMultiSpotEvent: snapshot.used.multiFieldEvents < snapshot.allowed.multiFieldEvents && snapshot.used.multiSpotEvents < snapshot.allowed.multiSpotEvents,
    canCreateMultiLocationEvent: snapshot.used.multiFieldEvents < snapshot.allowed.multiFieldEvents && snapshot.used.multiLocationEvents < snapshot.allowed.multiLocationEvents,
    canAddPin: snapshot.used.pins < snapshot.allowed.pins,
    canAddUser: snapshot.used.users < snapshot.allowed.users,
  };
}