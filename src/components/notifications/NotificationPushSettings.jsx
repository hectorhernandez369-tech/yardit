import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { enableOneSignalPush, getBrowserPushStatus, getOneSignalSubscriptionId, pushStatusLabel } from "@/lib/pushNotifications";
import { hasVerifiedPrimaryAddress } from "@/lib/trustActions";
import PushCategoryRow from "./PushCategoryRow";
import VendorSubscriptionManager from "./VendorSubscriptionManager";

const defaults = { push_enabled: false, alerts_push_enabled: true, listings_near_me_push_enabled: false, listings_near_me_radius_miles: 2, vendor_near_me_push_enabled: false, vendor_near_me_radius_miles: 2, marketing_push_enabled: false };

export default function NotificationPushSettings({ user, onVerifyAddress }) {
  const queryClient = useQueryClient();
  const [browserStatus, setBrowserStatus] = useState("not_enabled");
  const [enabling, setEnabling] = useState(false);
  const verifiedAddress = hasVerifiedPrimaryAddress(user);

  useEffect(() => { setBrowserStatus(getBrowserPushStatus()); }, []);

  const { data: preference } = useQuery({
    queryKey: ["notificationPreference", user?.id],
    queryFn: async () => (await base44.entities.NotificationPreference.filter({ user_id: user.id }))[0] || null,
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (patch) => {
      const data = { ...defaults, ...(preference || {}), ...patch, user_id: user.id, last_updated_at: new Date().toISOString() };
      if (preference?.id) return base44.entities.NotificationPreference.update(preference.id, data);
      return base44.entities.NotificationPreference.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificationPreference", user?.id] }),
  });

  const savePushSubscription = async (status, subscriptionId) => {
    const existing = await base44.entities.PushSubscription.filter({ user_id: user.id });
    const data = { user_id: user.id, onesignal_subscription_id: subscriptionId, permission_status: status, is_active: status === "enabled", user_agent: navigator.userAgent, updated_at: new Date().toISOString() };
    if (existing[0]) await base44.entities.PushSubscription.update(existing[0].id, data);
    else await base44.entities.PushSubscription.create({ ...data, created_at: new Date().toISOString() });
  };

  useEffect(() => {
    if (!user?.id || browserStatus !== "enabled") return;
    enableOneSignalPush({ userId: user.id }).then((result) => {
      if (result.subscriptionId) savePushSubscription("enabled", result.subscriptionId);
    });
  }, [user?.id, browserStatus]);

  const handleEnablePush = async () => {
    setEnabling(true);
    const result = await enableOneSignalPush({ userId: user.id });
    setBrowserStatus(result.status);
    if (["enabled", "not_enabled", "blocked", "unsupported"].includes(result.status)) {
      await savePushSubscription(result.status, result.subscriptionId || await getOneSignalSubscriptionId());
    }
    if (result.status === "enabled" && result.subscriptionId) { await saveMutation.mutateAsync({ push_enabled: true }); toast.success("Push notifications enabled and connected to this account"); }
    else if (result.status === "needs_install") toast.error("Install Yardit to your home screen first, then open the installed app to enable push notifications.");
    else if (result.status === "blocked") toast.error("Notifications are blocked in your browser or device settings.");
    else if (result.status === "unsupported") toast.error("Push notifications are not supported by this browser or device.");
    else toast.error("Push permission was not completed. Please try again.");
    setEnabling(false);
  };

  const pref = { ...defaults, ...(preference || {}) };
  const guardedToggle = (field, value) => {
    if ((field === "listings_near_me_push_enabled" || field === "vendor_near_me_push_enabled") && value && !verifiedAddress) {
      localStorage.setItem("yardit_pending_push_intent", field);
      onVerifyAddress?.();
      return;
    }
    saveMutation.mutate({ [field]: value });
  };

  return <Card className="border-2 border-[#5DADA5]/30 shadow-sm">
    <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Bell className="h-5 w-5" /> Notification Settings</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-slate-600">Choose which notifications you want sent as push alerts. These settings do not remove notifications from your Yardit notification history.</p>
      <div className="flex flex-col gap-3 rounded-2xl bg-[#F3E6CF] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-bold text-[#2C4F4E]">Push permission: {pushStatusLabel(browserStatus)}</p><p className="text-xs text-slate-600">Bell/history notifications are always kept separately.</p>{browserStatus === "needs_install" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">On iPhone or iPad, install Yardit to your Home Screen first, then open the installed app to enable push.</p>}</div>
        {browserStatus !== "enabled" && <Button onClick={handleEnablePush} disabled={enabling || browserStatus === "blocked" || browserStatus === "unsupported" || browserStatus === "needs_install"} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">{enabling && <Loader2 className="h-4 w-4 animate-spin" />} Enable Push Notifications</Button>}
      </div>
      <PushCategoryRow title="Alerts" description="Important account, platform, billing, approval, safety, support, and policy notices." checked={pref.alerts_push_enabled} onCheckedChange={(v) => saveMutation.mutate({ alerts_push_enabled: v })} />
      <PushCategoryRow title="Listings Near Me" description="Get push alerts when new yard sales, neighborhood sales, or events appear near your verified address." checked={pref.listings_near_me_push_enabled} onCheckedChange={(v) => guardedToggle("listings_near_me_push_enabled", v)} radius={pref.listings_near_me_radius_miles} onRadiusChange={(v) => saveMutation.mutate({ listings_near_me_radius_miles: v })} note={!verifiedAddress ? "Requires a verified address." : ""} />
      <PushCategoryRow title="Vendor Check-Ins Near Me" description="Get push alerts when vendors check in near your verified address." checked={pref.vendor_near_me_push_enabled} onCheckedChange={(v) => guardedToggle("vendor_near_me_push_enabled", v)} radius={pref.vendor_near_me_radius_miles} onRadiusChange={(v) => saveMutation.mutate({ vendor_near_me_radius_miles: v })} note={!verifiedAddress ? "Requires a verified address." : ""} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h4 className="mb-2 font-bold text-[#2C4F4E]">Vendor Subscriptions</h4><VendorSubscriptionManager user={user} /></div>
    </CardContent>
  </Card>;
}