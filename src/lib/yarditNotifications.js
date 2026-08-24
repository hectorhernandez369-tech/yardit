import { base44 } from "@/api/base44Client";
import { DELIVERY, NOTIFICATION_REGISTRY_VERSION, getDeliveryMethods } from "@/lib/notificationRegistry";

function compact(record) {
  return Object.fromEntries(Object.entries(record || {}).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

async function getNotificationById(id) {
  if (!id) return null;
  const rows = await base44.entities.Notification.filter({ id }).catch(() => []);
  return rows[0] || { id };
}

/**
 * One Yardit notification entry point for browser/UI actions.
 * Push-capable types go through the server delivery function so bell history,
 * preferences, OneSignal targeting, retries, and delivery logging stay aligned.
 */
export async function sendYarditNotification(notification = {}) {
  const type = notification.type || "notification";
  const deliveryMethods = getDeliveryMethods(type, notification);
  const payload = compact({
    ...notification,
    delivery_methods: deliveryMethods,
    registry_status: notification.registry_status || "active",
    registry_version: notification.registry_version || NOTIFICATION_REGISTRY_VERSION,
  });

  if (!deliveryMethods.includes(DELIVERY.PUSH)) {
    return base44.entities.Notification.create(payload);
  }

  try {
    const response = await base44.functions.invoke("deliverNotificationPush", payload);
    const data = response?.data || response || {};
    if (data.history_notification_id) {
      return await getNotificationById(data.history_notification_id);
    }

    // Email-only invitations can exist before that email has a Yardit user account.
    // Preserve the in-app invitation record even though a push cannot be targeted yet.
    if (data.reason === "No Yardit user could be resolved for this notification" || data.skipped === true) {
      return base44.entities.Notification.create(payload);
    }

    throw new Error(data.error || data.reason || "Push delivery did not create notification history.");
  } catch (error) {
    // A notification failure must never undo the user's main action. Preserve bell/history.
    console.error("Yardit notification delivery failed:", error);
    return base44.entities.Notification.create(payload);
  }
}
