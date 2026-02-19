/**
 * Yardit Case Management System v1.3 — Mutation Layer
 * 
 * Central barrel file. Import all mutations from here.
 * 
 * CHECKLIST:
 * ✅ assignCaseToSelf    — Any admin, in_queue only
 * ✅ assignCase           — Supervisor+, in_queue only
 * ✅ changeCasePriority   — Supervisor+, safety guardrail
 * ✅ addCaseComment       — Any admin
 * ✅ setDisposition       — Assigned admin only, open + unlocked
 * ✅ submitCase           — Assigned admin, requires disposition + comment
 * ✅ approveCase          — Supervisor+, submitted only
 * ✅ sendBackCase         — Supervisor+, submitted only, requires notes
 * ✅ reassignSubmittedCase— Supervisor+, submitted only
 * ✅ searchCases          — Any admin, by account_number or listing_id
 * ✅ logAdminEvent        — Click-level event logger
 * 
 * All mutations enforce: validate → log AdminAction → mutate Case → notify
 */

export { assignCaseToSelf } from "./mutations/assignCaseToSelf";
export { assignCase } from "./mutations/assignCase";
export { changeCasePriority } from "./mutations/changeCasePriority";
export { addCaseComment } from "./mutations/addCaseComment";
export { setDisposition } from "./mutations/setDisposition";
export { submitCase } from "./mutations/submitCase";
export { approveCase } from "./mutations/approveCase";
export { sendBackCase } from "./mutations/sendBackCase";
export { reassignSubmittedCase } from "./mutations/reassignSubmittedCase";
export { searchCases } from "./mutations/searchCases";
export { logAdminEvent } from "./lib/eventLogger";
export { logAdminAction, notifyAdmin, notifySupervisors } from "./lib/auditLogger";
export { isSupervisor, isAdminLite, isAnyAdmin } from "./lib/roles";