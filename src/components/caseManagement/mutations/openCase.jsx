import { base44 } from "@/api/base44Client";
import { requireAssigned } from "../lib/roles";
import { logAdminAction } from "../lib/auditLogger";

export async function openCase(caseId, adminId, adminUser) {
  const cases = await base44.entities.Case.filter({ id: caseId });
  const c = cases[0];
  if (!c) return { success: false, error: "Case not found" };

  const permErr = requireAssigned(c, adminId, "openCase");
  if (permErr) return permErr;

  if (c.status !== "assigned") {
    return { success: false, error: `Cannot open: case status is '${c.status}', must be 'assigned'` };
  }

  await logAdminAction({
    caseId,
    listingId: c.listing_id,
    adminId,
    actionType: "open_case",
    oldValue: { status: c.status },
    newValue: { status: "open" },
  });

  await base44.entities.Case.update(caseId, { status: "open" });

  return { success: true };
}