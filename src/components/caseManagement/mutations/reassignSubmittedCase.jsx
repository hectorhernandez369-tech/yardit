import { base44 } from "@/api/base44Client";
import { requireSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * reassignSubmittedCase(caseId, supervisorAdminId, newAdminId, supervisorNotes, supervisorUser)
 * - Only Supervisor/Master
 * - Only if status=='submitted'
 * - Keeps status='submitted', disposition_locked=true
 * - Updates assigned_admin_id to newAdminId
 * - AdminAction: 'reassign'
 * - Notifies newAdminId and old assigned admin
 */
export async function reassignSubmittedCase(caseId, supervisorAdminId, newAdminId, supervisorNotes, supervisorUser) {
  const permErr = requireSupervisor(supervisorUser, "reassignSubmittedCase");
  if (permErr) return permErr;

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  if (c.status !== "submitted") {
    return { success: false, error: `Cannot reassign: case status is '${c.status}', must be 'submitted'` };
  }

  const oldAdminId = c.assigned_admin_id;

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: supervisorAdminId,
    actionType: "reassign",
    oldValue: { assigned_admin_id: oldAdminId },
    newValue: { assigned_admin_id: newAdminId },
    comment: supervisorNotes || undefined,
  });

  // Optional supervisor comment
  if (supervisorNotes && supervisorNotes.trim()) {
    await base44.entities.CaseComment.create({
      case_id: caseId,
      admin_id: supervisorAdminId,
      comment_text: supervisorNotes,
      comment_type: "supervisor_note",
    });
  }

  // Mutate
  await base44.entities.Case.update(caseId, { assigned_admin_id: newAdminId });

  // Notify new admin
  await notifyAdmin({
    caseId,
    adminId: newAdminId,
    title: "Case Reassigned",
    message: "Case reassigned to you (Submitted)",
    type: "case_reassigned"
  });

  // Notify old admin if different
  if (oldAdminId && oldAdminId !== newAdminId) {
    await notifyAdmin({
      caseId,
      adminId: oldAdminId,
      title: "Case Reassigned",
      message: "Case reassigned away from you",
      type: "case_reassigned_away"
    });
  }

  return { success: true };
}