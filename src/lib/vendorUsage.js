import { getVendorTierConfig } from "@/lib/vendorTiers";
import { getVendorAccountCapabilities } from "@/lib/getVendorAccountCapabilities";

export const COUNTED_VENDOR_EVENT_STATUSES = ["draft", "pending_payment", "published", "active"];

export function isVendorUsageEventActive(event, monthDate = new Date()) {
  if (!event?.startDateTime) return false;
  if (!COUNTED_VENDOR_EVENT_STATUSES.includes(event.status || "draft")) return false;

  const eventDate = new Date(event.startDateTime);
  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth();
}

export function getVendorTierAllowance(account) {
  // Always derive limits from the account's own tier — never from a user-level tier.
  const caps = getVendorAccountCapabilities(account);
  return {
    singleEvents: caps.includedSingleEvents,
    multiSpotEvents: caps.includedMultiSpotEvents,
    multiLocationEvents: caps.includedMultiLocationEvents,
    multiFieldEvents: caps.includedMultiFieldEvents,
    pins: caps.maxPins,
    users: caps.maxUsers,
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
  // Count users with active OR accepted status — both grant dashboard access.
  const activeUsers = (users || []).filter((user) => user.status === "active" || user.status === "accepted");

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