import { base44 } from "@/api/base44Client";
import { requireAssigned } from "../lib/roles";
import { logAdminAction, notifySupervisors } from "../lib/auditLogger";

/**
 * submitCase(caseId, assignedAdminId, commentText, adminUser, allAdminUsers)
 * - ONLY assigned admin
 * - Requires status=='open', disposition present, commentText non-empty
 * - Creates CaseComment (admin_note) with submission comment
 * - Sets status='submitted', disposition_locked=true
 * - AdminAction: 'submit_case'
 * - Notifies all supervisors/masters
 */
export async function submitCase(caseId, assignedAdminId, commentText, adminUser, allAdminUsers) {
  if (!commentText || !commentText.trim()) {
    return { success: false, error: "Submission comment is required" };
  }

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  const permErr = requireAssigned(c, assignedAdminId, "submitCase");
  if (permErr) return permErr;

  if (c.status !== "open") {
    return { success: false, error: `Cannot submit: case status is '${c.status}', must be 'open'` };
  }
  if (!c.disposition) {
    return { success: false, error: "Cannot submit: disposition must be set before submission" };
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: assignedAdminId,
    actionType: "submit_case",
    oldValue: { status: c.status, disposition_locked: c.disposition_locked },
    newValue: { status: "submitted", disposition_locked: true },
    comment: commentText,
  });

  // Create submission comment
  await base44.entities.CaseComment.create({
    case_id: caseId,
    admin_id: assignedAdminId,
    comment_text: commentText,
    comment_type: "admin_note",
  });

  // Mutate
  await base44.entities.Case.update(caseId, {
    status: "submitted",
    disposition_locked: true,
  });

  // Notify supervisors
  await notifySupervisors({
    caseId,
    message: "Case submitted for review",
    allAdminUsers,
  });

  return { success: true };
}