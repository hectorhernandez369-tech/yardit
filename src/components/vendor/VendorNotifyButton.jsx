import React, { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enablePushNotifications, getBrowserPushStatus, getOneSignalSubscriptionId, PUSH_RADIUS_OPTIONS } from "@/lib/pushNotifications";
import { hasVerifiedPrimaryAddress } from "@/lib/trustActions";

const recordTimestamp = (record) => {
  const value = record?.updated_at || record?.updated_date || record?.created_at || record?.created_date;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};
const newestRecord = (records = []) => [...records].sort((a, b) => recordTimestamp(b) - recordTimestamp(a))[0] || null;

export default function VendorNotifyButton({ account }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [radius, setRadius] = useState(2);
  const [busy, setBusy] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)); }, []);

  const { data: subscription } = useQuery({
    queryKey: ["vendorNotifySubscription", user?.id, account?.id],
    queryFn: async () => (await base44.entities.VendorNotificationSubscription.filter({ user_id: user.id, vendor_account_id: account.id }))[0] || null,
    enabled: !!user?.id && !!account?.id,
  });

  useEffect(() => { if (subscription?.radius_miles) setRadius(subscription.radius_miles); }, [subscription?.radius_miles]);

  const saveMutation = useMutation({
    mutationFn: async (data) => subscription?.id ? base44.entities.VendorNotificationSubscription.update(subscription.id, data) : base44.entities.VendorNotificationSubscription.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorNotifySubscription", user?.id, account?.id] }),
  });

  const handleSave = async () => {
    if (!user) { await base44.auth.redirectToLogin(window.location.href); return; }
    if (account.owner_user_id === user.id || account.owner_email === user.email) { toast.error("You already manage this vendor account."); return; }
    if (!hasVerifiedPrimaryAddress(user)) { localStorage.setItem("yardit_pending_vendor_subscription", JSON.stringify({ vendor_account_id: account.id, radius_miles: radius, return_to: window.location.href })); toast.error("Please verify your address first."); window.location.href = "/Profile"; return; }
    setBusy(true);
    const status = getBrowserPushStatus();
    let subscriptionId = await getOneSignalSubscriptionId();
    if (status !== "enabled" || !subscriptionId) {
      const result = await enablePushNotifications({ userId: user.id });
      if (result.status !== "enabled") {
        setBusy(false);
        const message = result.status === "needs_install" ? "Install Yardit to your Home Screen first, then open the installed app and try again." : result.status === "blocked" ? "Notifications are blocked in your browser or device settings." : result.status === "unsupported" ? "Push notifications are not supported by this browser or device." : "Push notifications are not enabled on this device.";
        toast.error(message);
        return;
      }
      subscriptionId = result.subscriptionId || await getOneSignalSubscriptionId();
    }
    if (subscriptionId) {
      const existingPushRows = await base44.entities.PushSubscription.filter({ user_id: user.id });
      const currentUserAgent = navigator.userAgent;
      const matchingPushRow = existingPushRows.find((row) => row.onesignal_subscription_id === subscriptionId)
        || existingPushRows.find((row) => row.user_agent === currentUserAgent);
      const pushData = { user_id: user.id, onesignal_subscription_id: subscriptionId, permission_status: "enabled", is_active: true, user_agent: currentUserAgent, updated_at: new Date().toISOString() };
      if (matchingPushRow) await base44.entities.PushSubscription.update(matchingPushRow.id, pushData);
      else await base44.entities.PushSubscription.create({ ...pushData, created_at: new Date().toISOString() });
    }
    await saveMutation.mutateAsync({ user_id: user.id, vendor_account_id: account.id, radius_miles: radius, subscription_enabled: true, created_at: subscription?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() });
    setBusy(false);
    toast.success("Vendor nearby alerts saved");
  };

  const active = subscription?.subscription_enabled !== false && !!subscription;
  return <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#5DADA5]/30 bg-[#E9FFFB] p-3">
    <Button type="button" onClick={handleSave} disabled={busy} className="rounded-full bg-[#5DADA5] text-white hover:bg-[#4A9B93]"><Bell className="h-4 w-4" /> {busy && <Loader2 className="h-4 w-4 animate-spin" />} Notify Me When Nearby</Button>
    <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="rounded-full border border-[#2C4F4E]/20 bg-white px-3 py-2 text-sm">
      {PUSH_RADIUS_OPTIONS.map((miles) => <option key={miles} value={miles}>{miles} mile{miles !== 1 ? "s" : ""}</option>)}
    </select>
    {active && <Button type="button" variant="outline" onClick={() => saveMutation.mutate({ subscription_enabled: false, updated_at: new Date().toISOString() })} className="rounded-full">Unsubscribe</Button>}
    <p className="w-full text-xs text-[#2C4F4E]">Choose how close this vendor should be before Yardit sends you a push alert.</p>
  </div>;
}