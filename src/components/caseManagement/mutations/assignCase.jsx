import { base44 } from "@/api/base44Client";
import { requireSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * assignCase(caseId, supervisorAdminId, targetAdminId, supervisorUser)
 * - Only Supervisor/Master
 * - Only if Case.status == 'in_queue'
 * - Sets assigned_admin_id = targetAdminId, originating_admin_id = targetAdminId (first assignment), status = 'assigned'
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

  const updateData = {
    assigned_admin_id: targetAdminId,
    status: "assigned",
  };
  // Set originating_admin_id only if not already set (first assignment from in_queue)
  if (!c.originating_admin_id) {
    updateData.originating_admin_id = targetAdminId;
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: supervisorAdminId,
    actionType: "assign_other",
    oldValue: { status: c.status, assigned_admin_id: c.assigned_admin_id || null },
    newValue: { status: "assigned", assigned_admin_id: targetAdminId, originating_admin_id: updateData.originating_admin_id || c.originating_admin_id },
  });

  // Mutate
  await base44.entities.Case.update(caseId, updateData);

  // Notify
  await notifyAdmin({ 
    caseId, 
    adminId: targetAdminId, 
    title: "Case Assigned", 
    message: "A supervisor has assigned a case to you.", 
    type: "assign_admin" 
  });

  return { success: true };
}