/**
 * AdminEvent Logger — click-level / UI-event logging.
 * Call this from UI components to record granular user interactions.
 */

import { base44 } from "@/api/base44Client";

/**
 * Log a UI-level admin event.
 * @param {{ adminId: string, caseId?: string, eventType: string, payload?: object, page: string }}
 * @returns {Promise<{ success: boolean, event?: object }>}
 */
export async function logAdminEvent({ adminId, caseId = null, eventType, payload = null, page }) {
  const event = await base44.entities.AdminEvent.create({
    admin_id: adminId,
    case_id: caseId || undefined,
    event_type: eventType,
    event_payload: payload ? JSON.stringify(payload) : undefined,
    page,
  });
  return { success: true, event };
}