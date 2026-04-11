import { format } from "date-fns";
import {
  buildChangeSummary,
  formatPageArea,
  getBadgeTone,
  getFriendlyActionLabel,
  getLogCategory,
  getTargetSummary,
  isLowPriorityLog,
  parseJsonSafe,
} from "../adminLogsUtils";

export const ACTIVITY_FILTERS = [
  { key: "all", label: "All" },
  { key: "actions", label: "Actions" },
  { key: "cases", label: "Cases" },
  { key: "listings", label: "Listings" },
  { key: "users", label: "Users" },
  { key: "system", label: "System" },
];

export function getActorLabel(log, references = {}) {
  if (log.admin_id && references.admins?.[log.admin_id]) return references.admins[log.admin_id];
  if (log.admin_employee_id) return `Admin • ${log.admin_employee_id}`;
  if (log.created_by) return log.created_by;
  return "System";
}

export function getReadableTitle(log) {
  const type = (log.event_type || log.action_type || "").toLowerCase();
  if (type === "changed_tab") {
    const payload = parseJsonSafe(log.event_payload);
    const tabName = payload?.tab || payload?.tab_name || payload?.value;
    return tabName ? `Viewed ${String(tabName).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} Tab` : "Viewed Queue Tab";
  }
  return getFriendlyActionLabel(log);
}

export function getPreviewText(log, references = {}) {
  const changes = buildChangeSummary(log, references);
  if (changes.length > 0) {
    return changes.slice(0, 2).map((change) => `${change.field}: ${change.before || "—"} → ${change.after || "—"}`).join(" • ");
  }

  if (log.comment) return log.comment;

  const payload = parseJsonSafe(log.event_payload || log.metadata);
  if (payload && typeof payload === "object") {
    return Object.entries(payload)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .slice(0, 2)
      .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
      .join(" • ");
  }

  return "No additional details";
}

export function matchesFilter(log, filterKey) {
  if (filterKey === "all") return true;
  const category = getLogCategory(log);
  if (filterKey === "actions") return ["admin", "status", "security"].includes(category);
  if (filterKey === "cases") return category === "case";
  if (filterKey === "listings") return category === "listing";
  if (filterKey === "users") return category === "user" || category === "admin";
  if (filterKey === "system") return category === "security" || isLowPriorityLog(log);
  return true;
}

export function groupLogsByDate(logs) {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = format(yesterdayDate, "yyyy-MM-dd");

  const groups = [];
  const groupedMap = new Map();

  logs.forEach((log) => {
    const date = new Date(log.created_at || log.created_date);
    const key = format(date, "yyyy-MM-dd");
    let label = format(date, "MMMM d, yyyy");
    if (key === today) label = "Today";
    else if (key === yesterday) label = "Yesterday";

    if (!groupedMap.has(key)) {
      groupedMap.set(key, { key, label, logs: [] });
      groups.push(groupedMap.get(key));
    }

    groupedMap.get(key).logs.push(log);
  });

  return groups;
}

export function getActivityCardData(log, references = {}) {
  return {
    title: getReadableTitle(log),
    actor: getActorLabel(log, references),
    target: getTargetSummary(log, references),
    location: formatPageArea(log.page),
    preview: getPreviewText(log, references),
    tone: getBadgeTone(log),
    isNoise: isLowPriorityLog(log),
  };
}