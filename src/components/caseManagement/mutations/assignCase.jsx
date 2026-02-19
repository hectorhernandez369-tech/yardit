import { base44 } from "@/api/base44Client";
import { requireSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * assignCase(caseId, supervisorAdminId, targetAdminId, supervisorUser)
 * - Only Supervisor/Master
 * - Only if Case.status == 'in_queue'
 * - Sets assigned_admin_id = targetAdminId, status = 'open'
 * - AdminAction: 'assign_other'
 * - Notifies targetAdminId
 */
export async function assignCase(caseId, supervisorAdminId, targetAdminId, supervisorUser) {
  const permErr = requireSupervisor(supervisorUser, "assignCase");
  if (permErr) return permErr;

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  if (c.status !== "in_queue") {
    return { success: false, error: `Cannot assign: case status is '${c.status}', must be 'in_queue'` };
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: supervisorAdminId,
    actionType: "assign_other",
    oldValue: { status: c.status, assigned_admin_id: c.assigned_admin_id || null },
    newValue: { status: "open", assigned_admin_id: targetAdminId },
  });

  // Mutate
  await base44.entities.Case.update(caseId, {
    assigned_admin_id: targetAdminId,
    status: "open",
  });

  // Notify
  await notifyAdmin({ caseId, adminId: targetAdminId, message: "Case assigned to you" });

  return { success: true };
}