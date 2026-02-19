/**
 * Safety Flag Enforcement Helper
 * 
 * If safety_flag is true, case_priority MUST be 'high'.
 * Use this guard before any priority change or safety flag mutation.
 */

/**
 * Validates that a requested priority is allowed given the case's safety_flag.
 * Returns an error object if invalid, null if OK.
 */
export function validateSafetyPriority(safetyFlag, requestedPriority) {
  if (safetyFlag && requestedPriority !== "high") {
    return {
      success: false,
      error: "Safety-flagged cases must remain 'high' priority. Cannot downgrade.",
    };
  }
  return null;
}

/**
 * Given a case record, returns the enforced priority.
 * If safety_flag is true, always returns 'high' regardless of input.
 */
export function enforceSafetyPriority(caseRecord, requestedPriority) {
  if (caseRecord.safety_flag) {
    return "high";
  }
  return requestedPriority;
}