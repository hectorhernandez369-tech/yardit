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
  // We no longer create CaseNotification because we migrated to the global Notification system
  try {
    const notif = await base44.entities.Notification.create({
      user_id: adminId,
      userId: adminId,
      type,
      title,
      message,
      related_entity_type: "case",
      related_entity_id: caseId,
      is_read: false,
      read: false,
    });
    console.log("Created Notification:", {
      user_id: notif.user_id || notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      related_entity_type: notif.related_entity_type,
      related_entity_id: notif.related_entity_id,
      created_at: notif.created_date
    });
  } catch (e) {
    console.error("Failed to create case notification:", e);
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