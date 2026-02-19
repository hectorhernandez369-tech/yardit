import { base44 } from "@/api/base44Client";
import { requireSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * changeCasePriority(caseId, supervisorAdminId, priority, supervisorUser)
 * - Only Supervisor/Master
 * - If safety_flag == true, priority must stay 'high' (cannot downgrade)
 * - AdminAction: 'change_priority'
 * - Optional notification to assigned admin
 */
export async function changeCasePriority(caseId, supervisorAdminId, priority, supervisorUser) {
  const permErr = requireSupervisor(supervisorUser, "changeCasePriority");
  if (permErr) return permErr;

  if (!["high", "medium", "low"].includes(priority)) {
    return { success: false, error: `Invalid priority: ${priority}` };
  }

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  if (c.safety_flag && priority !== "high") {
    return { success: false, error: "Safety-flagged cases must remain 'high' priority" };
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: supervisorAdminId,
    actionType: "change_priority",
    oldValue: { case_priority: c.case_priority },
    newValue: { case_priority: priority },
  });

  // Mutate
  await base44.entities.Case.update(caseId, { case_priority: priority });

  // Notify assigned admin if exists
  if (c.assigned_admin_id) {
    await notifyAdmin({
      caseId,
      adminId: c.assigned_admin_id,
      message: "Priority updated",
    });
  }

  return { success: true };
}