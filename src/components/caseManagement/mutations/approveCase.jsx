import { base44 } from "@/api/base44Client";
import { requireSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * approveCase(caseId, supervisorAdminId, supervisorComment, supervisorUser)
 * - Only Supervisor/Master
 * - Only if status=='submitted'
 * - Optional CaseComment (supervisor_note)
 * - Sets status='closed'
 * - AdminAction: 'approve_case'
 * - Notifies assigned admin
 */
export async function approveCase(caseId, supervisorAdminId, supervisorComment, supervisorUser) {
  const permErr = requireSupervisor(supervisorUser, "approveCase");
  if (permErr) return permErr;

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  if (c.status !== "submitted") {
    return { success: false, error: `Cannot approve: case status is '${c.status}', must be 'submitted'` };
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: supervisorAdminId,
    actionType: "approve_case",
    oldValue: { status: c.status },
    newValue: { status: "closed" },
    comment: supervisorComment || undefined,
  });

  // Optional comment
  if (supervisorComment && supervisorComment.trim()) {
    await base44.entities.CaseComment.create({
      case_id: caseId,
      admin_id: supervisorAdminId,
      comment_text: supervisorComment,
      comment_type: "supervisor_note",
    });
  }

  // Mutate
  await base44.entities.Case.update(caseId, { status: "closed" });

  // Notify assigned admin
  if (c.assigned_admin_id) {
    await notifyAdmin({
      caseId,
      adminId: c.assigned_admin_id,
      message: "Case approved and closed",
    });
  }

  return { success: true };
}