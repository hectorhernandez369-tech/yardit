import { base44 } from "@/api/base44Client";

export async function respondToResidentialAccessRequest(notification, action) {
  const requestId = notification?.metadata?.request_id || notification?.related_entity_id;
  if (!requestId) {
    throw new Error("Request not found.");
  }

  const response = await base44.functions.invoke("manageResidentialAccessRequest", {
    action: "respond",
    request_id: requestId,
    response: action === "approve" || action === "accept" ? "approved" : "denied",
  });

  if (!response?.data?.success) {
    throw new Error(response?.data?.error || "Could not respond to this request.");
  }

  await base44.entities.Notification.update(notification.id, {
    read: true,
    is_read: true,
    type: "residential_access_request_resolved",
    message: action === "approve" || action === "accept"
      ? "You approved household access for this yard sale."
      : "You denied household access for this yard sale.",
  });

  return response.data;
}