export const VENDOR_EVENT_TYPES = [
  { value: "single", label: "Single Event" },
  { value: "multi_spot", label: "Multi-Spot Event" },
  { value: "multi_location", label: "Multi-Location Event" },
];

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