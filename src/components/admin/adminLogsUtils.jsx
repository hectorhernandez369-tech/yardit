export const LOW_PRIORITY_EVENT_TYPES = ["changed_tab"];

const ACTION_LABELS = {
  clicked_assign_self: "Assigned Case to Self",
  assign_self: "Case Assigned",
  changed_tab: "Viewed Queue Tab",
  supervisor_comment: "Added Supervisor Note",
  deactivate_admin: "Deactivated Admin",
  reactivate_admin: "Reactivated Admin",
  opened_case: "Reviewed Case",
  assign_case: "Assigned Case",
  reassign_case: "Reassigned Case",
  submit_case: "Submitted Case",
  approve_case: "Approved Case",
  reject_case: "Rejected Case",
  close_case: "Closed Case",
  update_status: "Updated Status",
  create_admin: "Created Admin",
  update_admin: "Updated Admin",
  delete_admin: "Deleted Admin",
  admin_created_listing: "Created Listing for User",
  admin_granted_free_listing: "Granted Free Listing",
  admin_granted_premium_upgrade: "Granted Premium Upgrade",
  admin_granted_vendor_promotion: "Granted Vendor Promotion",
  admin_applied_discount: "Applied Discount",
  admin_voided_fee: "Voided Fee",
  admin_granted_credit: "Granted Credit",
  admin_used_override: "Used Admin Override",
};

const FIELD_LABELS = {
  status: "Status",
  assigned_admin_id: "Assigned Admin",
  case_priority: "Priority",
  disposition: "Disposition",
  disposition_locked: "Disposition Lock",
  safety_flag: "Safety Flag",
  is_active: "Active Status",
  role_label: "Role",
  accountStatus: "Account Status",
  supervisor_user_id: "Supervisor",
};

const VALUE_LABELS = {
  in_queue: "In Queue",
  assigned: "Assigned",
  open: "Open",
  submitted: "Submitted",
  submitted_for_review: "Submitted for Review",
  escalated_to_supervisor: "Escalated to Supervisor",
  escalated_to_master: "Escalated to Master",
  closed: "Closed",
  active: "Active",
  suspended: "Suspended",
  warned: "Warned",
  banned: "Banned",
  true: "Yes",
  false: "No",
  null: "None",
  undefined: "None",
};

export function getFriendlyActionLabel(log) {
  const key = (log.event_type || log.action_type || "").toLowerCase();
  return ACTION_LABELS[key] || startCase(key.replaceAll("_", " ")) || "Admin Activity";
}

export function getLogCategory(log) {
  const type = (log.event_type || log.action_type || "").toLowerCase();
  if (type.includes("pin") || type.includes("access") || type.includes("login") || type.includes("lock")) return "security";
  if (log.case_id || type.includes("case") || type.includes("disposition") || type.includes("assign")) return "case";
  if (log.listing_id || type.includes("listing")) return "listing";
  if (type.includes("user") || type.includes("accountstatus") || type.includes("account_status")) return "user";
  if (type.includes("admin")) return "admin";
  if (type.includes("status")) return "status";
  return "admin";
}

export function getBadgeTone(log) {
  const type = (log.event_type || log.action_type || "").toLowerCase();
  if (type.includes("view") || type.includes("open") || type.includes("changed_tab")) return "blue";
  if (type.includes("create") || type.includes("approve") || type.includes("reactivate")) return "green";
  if (type.includes("update") || type.includes("assign") || type.includes("reassign") || type.includes("submit") || type.includes("comment") || type.includes("status")) return "orange";
  if (type.includes("deactivate") || type.includes("delete") || type.includes("suspend") || type.includes("ban") || type.includes("reject") || type.includes("lock")) return "red";
  return "slate";
}

export function isLowPriorityLog(log) {
  const type = (log.event_type || log.action_type || "").toLowerCase();
  return LOW_PRIORITY_EVENT_TYPES.includes(type);
}

export function parseJsonSafe(value) {
  if (!value || typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function formatFieldLabel(field) {
  return FIELD_LABELS[field] || startCase(field.replaceAll("_", " "));
}

export function formatValue(value, lookups = {}) {
  if (value && typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" && lookups.admins?.[value]) return lookups.admins[value];
  if (typeof value === "string" && lookups.users?.[value]) return lookups.users[value];
  const normalized = String(value);
  return VALUE_LABELS[normalized] || normalized;
}

export function buildChangeSummary(log, lookups = {}) {
  const oldData = parseJsonSafe(log.old_value);
  const newData = parseJsonSafe(log.new_value);
  if (!oldData && !newData) return [];
  if (typeof oldData !== "object" || typeof newData !== "object") {
    return [{ field: "Update", before: formatValue(oldData, lookups), after: formatValue(newData, lookups) }];
  }

  const keys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
  return keys
    .filter((key) => JSON.stringify(oldData?.[key] ?? null) !== JSON.stringify(newData?.[key] ?? null))
    .map((key) => ({
      field: formatFieldLabel(key),
      before: formatValue(oldData?.[key] ?? null, lookups),
      after: formatValue(newData?.[key] ?? null, lookups),
    }));
}

export function getTargetSummary(log, references = {}) {
  const category = getLogCategory(log);
  if (log.case_id && references.cases?.[log.case_id]) return `Case: ${references.cases[log.case_id]}`;
  if (log.listing_id && references.listings?.[log.listing_id]) return `Listing: ${references.listings[log.listing_id]}`;
  if (category === "user" && log.target_id && references.users?.[log.target_id]) return `User: ${references.users[log.target_id]}`;
  if (category === "admin" && log.admin_id && references.admins?.[log.admin_id]) return `Admin: ${references.admins[log.admin_id]}`;
  return category === "security" ? "Security / Access" : startCase(category);
}

export function formatPageArea(page) {
  if (!page) return "Admin Hub";
  if (page === "AdminHub") return "Admin Hub";
  if (page === "case_management") return "Case Management";
  if (page === "AdminLite") return "Admin Hub";
  return startCase(String(page).replaceAll("_", " "));
}

function startCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}