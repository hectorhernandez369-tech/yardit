import { base44 } from "@/api/base44Client";
import { requireAnyAdmin } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * assignCaseToSelf(caseId, adminId, adminUser)
 * - Only if Case.status == 'in_queue' AND assigned_admin_id is null
 * - Sets assigned_admin_id = adminId, originating_admin_id = adminId (first assignment), status = 'open'
 * - AdminAction: 'assign_self'
 * - Notifies adminId
 */
export async function assignCaseToSelf(caseId, adminId, adminUser) {
  const permErr = requireAnyAdmin(adminUser, "assignCaseToSelf");
  if (permErr) return permErr;

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  if (c.status !== "in_queue") {
    return { success: false, error: `Cannot assign: case status is '${c.status}', must be 'in_queue'` };
  }
  if (c.assigned_admin_id) {
    return { success: false, error: "Case is already assigned to another admin" };
  }

  const updateData = {
    assigned_admin_id: adminId,
    status: "open",
  };
  // Set originating_admin_id only if not already set (first assignment from in_queue)
  if (!c.originating_admin_id) {
    updateData.originating_admin_id = adminId;
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId,
    actionType: "assign_self",
    oldValue: { status: c.status, assigned_admin_id: null },
    newValue: { status: "open", assigned_admin_id: adminId, originating_admin_id: updateData.originating_admin_id || c.originating_admin_id },
  });

  // Mutate
  await base44.entities.Case.update(caseId, updateData);

  // Notify
  await notifyAdmin({ caseId, adminId, message: "Case assigned to you" });

  return { success: true };
}