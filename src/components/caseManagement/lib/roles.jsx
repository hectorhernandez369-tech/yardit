/**
 * Case Management Role Helpers
 * Roles: admin_lite, supervisor, master
 * Master is treated as Supervisor+ (all supervisor permissions).
 *
 * Base44 platform uses "admin" as the default admin role.
 * normalizeRole maps "admin" → "admin_lite" so all permission
 * checks work without requiring a custom roles dashboard.
 */

const SUPERVISOR_ROLES = ["supervisor", "master"];

export function normalizeRole(rawRole) {
  if (rawRole === "admin") return "admin_lite";
  return rawRole;
}

export function isSupervisor(adminUser) {
  return SUPERVISOR_ROLES.includes(normalizeRole(adminUser?.role));
}

export function isAdminLite(adminUser) {
  return normalizeRole(adminUser?.role) === "admin_lite";
}

export function isAnyAdmin(adminUser) {
  return ["admin_lite", "supervisor", "master"].includes(normalizeRole(adminUser?.role));
}

export function requireSupervisor(adminUser, actionName) {
  if (!isSupervisor(adminUser)) {
    return { success: false, error: `Permission denied: ${actionName} requires Supervisor or Master role. Current role: ${adminUser?.role}` };
  }
  return null;
}

export function requireAnyAdmin(adminUser, actionName) {
  if (!isAnyAdmin(adminUser)) {
    return { success: false, error: `Permission denied: ${actionName} requires an admin role. Current role: ${adminUser?.role}` };
  }
  return null;
}

export function requireAssigned(caseRecord, adminId, actionName) {
  if (caseRecord.assigned_admin_id !== adminId) {
    return { success: false, error: `Permission denied: ${actionName} requires you to be the assigned admin on this case.` };
  }
  return null;
}