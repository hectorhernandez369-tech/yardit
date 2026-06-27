import { base44 } from "@/api/base44Client";
import { requireAssigned } from "../lib/roles";
import { logAdminAction } from "../lib/auditLogger";

/**
 * setDisposition(caseId, assignedAdminId, disposition, adminUser)
 * - ONLY assigned admin can set disposition
 * - Only if Case.status == 'open' AND disposition_locked == false
 * - AdminAction: 'set_disposition'
 */
export async function setDisposition(caseId, assignedAdminId, disposition, adminUser) {
  if (!["none", "sustained", "unconfirmed", "disproven"].includes(disposition)) {
    return { success: false, error: `Invalid disposition: ${disposition}` };
  }

  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  const permErr = requireAssigned(c, assignedAdminId, "setDisposition");
  if (permErr) return permErr;

  if (c.status !== "open") {
    return { success: false, error: `Cannot set disposition: case status is '${c.status}', must be 'open'` };
  }
  if (c.disposition_locked) {
    return { success: false, error: "Disposition is locked and cannot be changed" };
  }

  // Log FIRST
  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId: assignedAdminId,
    actionType: "set_disposition",
    oldValue: { disposition: c.disposition || null },
    newValue: { disposition },
  });

  // Mutate
  await base44.entities.Case.update(caseId, { disposition });

  return { success: true };
}