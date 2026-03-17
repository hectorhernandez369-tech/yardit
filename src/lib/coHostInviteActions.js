import { base44 } from "@/api/base44Client";

export async function respondToCoHostInvite(notification, action) {
  const inviteId = notification?.metadata?.invite_id;
  if (!inviteId) {
    throw new Error("Invite not found.");
  }

  const response = await base44.functions.invoke("manageNeighborhoodCoHostInvite", {
    action: "respond",
    invite_id: inviteId,
    response: action === "accept" ? "accepted" : "declined",
  });

  if (!response?.data?.success) {
    throw new Error(response?.data?.error || "Could not respond to invite.");
  }

  await base44.entities.Notification.update(notification.id, {
    read: true,
    is_read: true,
    type: "co_host_invite_resolved",
    message: action === "accept"
      ? "You accepted the Neighborhood Sale co-host request."
      : "You declined the Neighborhood Sale co-host request.",
  });

  return response.data;
}