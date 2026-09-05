import { base44 } from "@/api/base44Client";

export async function savePushSubscription({ subscriptionId, token = "" }) {
  const response = await base44.functions.invoke("savePushSubscription", {
    subscriptionId,
    token: token || undefined,
    userAgent: navigator.userAgent,
  });
  return response?.data?.success === true;
}