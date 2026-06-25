import { formatDistanceToNow } from "date-fns";

export const YARDIT_TIME_ZONE = "America/Los_Angeles";

export function parseUtcTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value);
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
  const date = new Date(hasTimezone ? raw : `${raw}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDeviceDateTime(value, options = {}) {
  const date = parseUtcTimestamp(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: options.includeSeconds ? "2-digit" : undefined,
    hour12: true,
  }).format(date);
}

export function formatDeviceRelativeTime(value) {
  const date = parseUtcTimestamp(value);
  if (!date) return "—";

  if (date.getTime() > Date.now()) return "Just now";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatYarditDateTime(value, options = {}) {
  const date = parseUtcTimestamp(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: YARDIT_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: options.includeSeconds ? "2-digit" : undefined,
    hour12: true,
  }).format(date);
}