export function getPublicRecordLat(record) {
  const lat = record?.lat ?? record?.latitude;
  return typeof lat === "number" && Number.isFinite(lat) ? lat : null;
}

export function getPublicRecordLng(record) {
  const lng = record?.lng ?? record?.longitude;
  return typeof lng === "number" && Number.isFinite(lng) ? lng : null;
}

function hasFutureDate(value, now) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date > now;
}

export function shouldRenderPublicMapRecord(record, now = new Date()) {
  if (!record || record.visibility !== "public") return false;
  if (record.visibility_rules?.should_render !== true) return false;
  if (getPublicRecordLat(record) === null || getPublicRecordLng(record) === null) return false;

  const hiddenStatuses = ["paused", "ended", "expired", "private", "rejected", "hidden"];
  if (hiddenStatuses.includes(String(record.status || "").toLowerCase())) return false;

  if (record.type === "vendor_pin_checkin") {
    return record.status === "live" &&
      record.checkin_status === "live" &&
      hasFutureDate(record.checkin_end_time, now);
  }

  if (record.type === "event") {
    return ["active", "scheduled"].includes(record.status) &&
      hasFutureDate(record.end_datetime || record.end_date, now);
  }

  return false;
}

export function getPublicRecordPriority(record) {
  const tier = record?.event_tier || record?.tier;
  if (tier === "growth") return 3000;
  if (tier === "pro") return 2000;
  return 1000;
}