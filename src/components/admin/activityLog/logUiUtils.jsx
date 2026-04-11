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

function getCaseContext(log, references = {}) {
  const payload = parseJsonSafe(log.event_payload);
  const caseLabel = log.case_id && references.cases?.[log.case_id] ? `Case: ${references.cases[log.case_id]}` : null;
  const listingTitle = payload?.listing_title || payload?.listingName || payload?.listing_title_snapshot || (log.listing_id && references.listings?.[log.listing_id]);
  const listingOwner = payload?.listing_owner_email || payload?.listingOwnerEmail || payload?.owner_email || payload?.listing_owner_name || payload?.owner_name;
  return [
    caseLabel,
    listingTitle ? `Listing: ${listingTitle}` : null,
    listingOwner ? `Owner: ${listingOwner}` : null,
  ].filter(Boolean).join(" • ");
}

function getNoteContext(log) {
  const payload = parseJsonSafe(log.event_payload);
  const noteType = payload?.comment_type || payload?.note_type || payload?.type;
  const noteText = payload?.comment_text || payload?.note || payload?.text || log.comment;
  const author = payload?.admin_name || payload?.admin_employee_id || payload?.added_by;
  return [
    noteType ? `Note Type: ${String(noteType).replaceAll("_", " ")}` : null,
    noteText ? `Note: ${String(noteText).slice(0, 80)}` : null,
    author ? `Added By: ${author}` : null,
  ].filter(Boolean).join(" • ");
}

function getListingContext(log, references = {}) {
  const payload = parseJsonSafe(log.event_payload);
  const listingTitle = payload?.listing_title || payload?.title || (log.listing_id && references.listings?.[log.listing_id]);
  const listingNumber = payload?.listing_number || payload?.listingNumber;
  const listingOwner = payload?.listing_owner_email || payload?.owner_email || payload?.listing_owner_name || payload?.owner_name;
  return [
    listingTitle ? `Listing: ${listingTitle}` : null,
    listingNumber ? `ID: ${listingNumber}` : null,
    listingOwner ? `Owner: ${listingOwner}` : null,
  ].filter(Boolean).join(" • ");
}

export function getPreviewText(log, references = {}) {
  const category = getLogCategory(log);
  const changes = buildChangeSummary(log, references);
  if (changes.length > 0) {
    return changes.slice(0, 2).map((change) => `${change.field}: ${change.before || "—"} → ${change.after || "—"}`).join(" • ");
  }

  if (category === "case") {
    const caseContext = getCaseContext(log, references);
    const noteContext = getNoteContext(log);
    return [caseContext, noteContext].filter(Boolean).join(" • ") || "Case activity recorded";
  }

  if (category === "listing") {
    return getListingContext(log, references) || "Listing activity recorded";
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
  const payload = parseJsonSafe(log.event_payload);
  const category = getLogCategory(log);

  let target = getTargetSummary(log, references);
  if (category === "case" && log.case_id && references.cases?.[log.case_id]) {
    target = `Case: ${references.cases[log.case_id]}`;
  }
  if (category === "listing") {
    const listingTitle = payload?.listing_title || payload?.title || (log.listing_id && references.listings?.[log.listing_id]);
    if (listingTitle) target = `Listing: ${listingTitle}`;
  }
  if (category === "user" && log.target_id && references.users?.[log.target_id]) {
    target = `User: ${references.users[log.target_id]}`;
  }

  return {
    title: getReadableTitle(log),
    actor: getActorLabel(log, references),
    target,
    location: formatPageArea(log.page),
    preview: getPreviewText(log, references),
    tone: getBadgeTone(log),
    isNoise: isLowPriorityLog(log),
  };
}