export const YARDIT_TIME_ZONE = "America/Los_Angeles";

export function formatYarditDateTime(value, options = {}) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

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