import { base44 } from "@/api/base44Client";
import { requireAnyAdmin, isSupervisor } from "../lib/roles";
import { logAdminAction, notifyAdmin } from "../lib/auditLogger";

/**
 * addCaseComment(caseId, adminId, commentText, commentType, adminUser)
 * - Any admin can comment
 * - Writes CaseComment row
 * - AdminAction logged with action reference only (no duplicated comment_text in newValue to avoid double-logging)
 * - If supervisor comments AND case has assigned admin, notify assigned admin
 */
export async function addCaseComment(caseId, adminId, commentText, commentType, adminUser) {
  const permErr = requireAnyAdmin(adminUser, "addCaseComment");
  if (permErr) return permErr;

  if (!commentText || !commentText.trim()) {
    return { success: false, error: "Comment text is required" };
  }

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  const isSup = isSupervisor(adminUser);
  const actionType = isSup ? "supervisor_comment" : "admin_comment";

  // Log FIRST — store only metadata, not the full comment text (that lives in CaseComment)
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId,
    actionType,
    newValue: { comment_type: commentType },
  });

  // Create comment (the single source of truth for comment text)
  await base44.entities.CaseComment.create({
    case_id: caseId,
    admin_id: adminId,
    comment_text: commentText,
    comment_type: commentType,
  });

  // If supervisor comments and case has assigned admin, notify them
  if (isSup && c.assigned_admin_id && c.assigned_admin_id !== adminId) {
    await notifyAdmin({
      caseId,
      adminId: c.assigned_admin_id,
      message: "Supervisor commented on your case",
    });
  }

  return { success: true };
}