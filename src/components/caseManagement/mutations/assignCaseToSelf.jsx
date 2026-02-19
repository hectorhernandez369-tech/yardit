import { base44 } from "@/api/base44Client";
import { requireAnyAdmin } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * assignCaseToSelf(caseId, adminId, adminUser)
 * - Only if Case.status == 'in_queue' AND assigned_admin_id is null
 * - Sets assigned_admin_id = adminId, status = 'open'
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

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId,
    actionType: "assign_self",
    oldValue: { status: c.status, assigned_admin_id: null },
    newValue: { status: "open", assigned_admin_id: adminId },
  });

  // Mutate
  await base44.entities.Case.update(caseId, {
    assigned_admin_id: adminId,
    status: "open",
  });

  // Notify
  await notifyAdmin({ caseId, adminId, message: "Case assigned to you" });

  return { success: true };
}