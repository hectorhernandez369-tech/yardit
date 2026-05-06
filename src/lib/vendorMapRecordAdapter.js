const toDateValue = (value) => value || new Date().toISOString();

export function publicMapRecordToListing(record) {
  const payload = record?.payload || {};
  const rawListingType = payload.listingType || payload.type || "event";
  const listingType = rawListingType === "vendor_pin_checkin" || rawListingType === "vendor_pin" ? "event" : rawListingType;
  const normalizedStatus = payload.status === "live" ? "active" : (payload.status || "active");
  const title = payload.title || payload.event_name || "Public Event";
  const lat = Number(payload.lat ?? payload.latitude);
  const lng = Number(payload.lng ?? payload.longitude);

  return {
    ...payload,
    id: `vendor-${record.id}`,
    sourceRecordId: record.source_record_id,
    sourceApp: record.source_app,
    isExternalPublicMapRecord: true,
    externalUrl: payload.external_url || payload.url || payload.detail_url || "",
    listingType,
    title,
    event_name: payload.event_name || title,
    description: payload.description || payload.event_description || "",
    event_description: payload.event_description || payload.description || "",
    category: payload.category || payload.event_category || "Event",
    event_category: payload.event_category || payload.category || "Event",
    event_icon: payload.event_icon || payload.icon || payload.map_icon || payload.icon_key || "calendar",
    event_logo_url: payload.event_logo_url || payload.logo_url || payload.image_url || "",
    tier: ["basic", "featured", "premium", "marquee"].includes(payload.tier || payload.event_tier) ? (payload.tier || payload.event_tier) : "premium",
    event_tier: ["basic", "featured", "premium", "marquee"].includes(payload.event_tier || payload.tier) ? (payload.event_tier || payload.tier) : "premium",
    status: normalizedStatus,
    city: payload.city || "",
    state: payload.state || "",
    display_address: payload.display_address || payload.address || payload.addressText || "",
    addressText: payload.addressText || payload.display_address || payload.address || "",
    lat,
    lng,
    startDateTime: toDateValue(payload.startDateTime || payload.start_datetime || payload.start_date_time),
    endDateTime: toDateValue(payload.endDateTime || payload.end_datetime || payload.end_date_time),
    photoUrls: payload.photoUrls || payload.photos || payload.image_urls || [],
    mapState: "active",
  };
}

export function publicMapRecordsToListings(records = []) {
  return records
    .filter((record) => record?.status === "active")
    .map(publicMapRecordToListing)
    .filter((listing) => Number.isFinite(listing.lat) && Number.isFinite(listing.lng));
}