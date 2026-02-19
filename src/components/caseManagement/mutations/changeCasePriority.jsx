import { base44 } from "@/api/base44Client";
import { requireSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";
import { validateSafetyPriority } from "../lib/safetyRules";

/**
 * changeCasePriority(caseId, supervisorAdminId, priority, supervisorUser)
 * - Only Supervisor/Master
 * - Uses safety rules helper to block downgrade on safety-flagged cases
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

  // Safety enforcement via helper
  const safetyErr = validateSafetyPriority(c.safety_flag, priority);

  // Log the attempt BEFORE rejecting — audit trail must capture blocked attempts
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: supervisorAdminId,
    actionType: "change_priority",
    oldValue: { case_priority: c.case_priority },
    newValue: { case_priority: priority },
    comment: safetyErr ? `BLOCKED: ${safetyErr.error}` : undefined,
  });

  if (safetyErr) return safetyErr;

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