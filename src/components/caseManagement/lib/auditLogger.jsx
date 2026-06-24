/**
 * Audit Logger — "Log first, then mutate" enforcement layer.
 * 
 * Every case mutation MUST call logAdminAction BEFORE applying state changes.
 * If the log write fails, the mutation must NOT proceed.
 */

import { base44 } from "@/api/base44Client";

/**
 * Write an AdminAction record. Returns { success, action?, error? }
 * This must succeed before any Case update is applied.
 */
export async function logAdminAction({
  caseId = null,
  listingId = null,
  adminId,
  actionType,
  oldValue = null,
  newValue = null,
  comment = null,
  page = "case_management",
}) {
  const action = await base44.entities.AdminAction.create({
    case_id: caseId || undefined,
    listing_id: listingId || undefined,
    admin_id: adminId,
    action_type: actionType,
    old_value: oldValue ? JSON.stringify(oldValue) : undefined,
    new_value: newValue ? JSON.stringify(newValue) : undefined,
    comment: comment || undefined,
    page,
  });
  return { success: true, action };
}

/**
 * Create a CaseNotification for a specific admin.
 */
export async function notifyAdmin({ caseId, adminId, message, title = "Case Update", type = "case_update" }) {
  try {
    await base44.entities.AdminInboxItem.create({
      recipient_admin_id: adminId,
      recipient_role: "admin",
      type: type?.startsWith("case_") ? "admin_case" : type,
      category: "cases",
      title,
      message,
      priority: "normal",
      status: "unread",
      related_entity_type: "case",
      related_entity_id: caseId,
      deep_link: `/AdminLite?section=case_management&openCaseId=${caseId}`,
      metadata: { original_type: type },
    });
  } catch (e) {
    console.error("Failed to create admin inbox item:", e);
  }
}

/**
 * Notify all supervisors/masters. Requires a list of admin users.
 */
export async function notifySupervisors({ caseId, message, allAdminUsers, title = "Case Update", type = "case_update" }) {
  const supervisors = allAdminUsers.filter(
    (u) => u.role === "supervisor" || u.role === "master"
  );
  for (const sup of supervisors) {
    await notifyAdmin({ caseId, adminId: sup.id, message, title, type });
  }
}