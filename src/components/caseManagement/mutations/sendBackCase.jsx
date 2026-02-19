import { base44 } from "@/api/base44Client";
import { requireSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * sendBackCase(caseId, supervisorAdminId, supervisorNotes, supervisorUser)
 * - Only Supervisor/Master
 * - Only if status=='submitted'
 * - Requires supervisorNotes non-empty
 * - Creates CaseComment (supervisor_note)
 * - Sets status='open', disposition_locked=false
 * - Assigned admin stays as-is
 * - AdminAction: 'send_back'
 * - Notifies assigned admin
 */
export async function sendBackCase(caseId, supervisorAdminId, supervisorNotes, supervisorUser) {
  const permErr = requireSupervisor(supervisorUser, "sendBackCase");
  if (permErr) return permErr;

  if (!supervisorNotes || !supervisorNotes.trim()) {
    return { success: false, error: "Supervisor notes are required when sending back a case" };
  }

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  if (c.status !== "submitted") {
    return { success: false, error: `Cannot send back: case status is '${c.status}', must be 'submitted'` };
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: supervisorAdminId,
    actionType: "send_back",
    oldValue: { status: c.status, disposition_locked: c.disposition_locked },
    newValue: { status: "open", disposition_locked: false },
    comment: supervisorNotes,
  });

  // Create supervisor comment
  await base44.entities.CaseComment.create({
    case_id: caseId,
    admin_id: supervisorAdminId,
    comment_text: supervisorNotes,
    comment_type: "supervisor_note",
  });

  // Mutate
  await base44.entities.Case.update(caseId, {
    status: "open",
    disposition_locked: false,
  });

  // Notify assigned admin
  if (c.assigned_admin_id) {
    await notifyAdmin({
      caseId,
      adminId: c.assigned_admin_id,
      message: "Case sent back for further investigation",
    });
  }

  return { success: true };
}