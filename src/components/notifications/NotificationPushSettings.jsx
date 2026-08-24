import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { canStorePushStatus, enableOneSignalPush, getBrowserPushStatus, getOneSignalSubscriptionId, getRuntimePushConnection, pushStatusLabel } from "@/lib/pushNotifications";
import { hasVerifiedPrimaryAddress } from "@/lib/trustActions";
import PushCategoryRow from "./PushCategoryRow";
import AlertsPushGroup from "./AlertsPushGroup";
import VendorSubscriptionManager from "./VendorSubscriptionManager";
import PushDebugPanel from "./PushDebugPanel";

const defaults = {
  push_enabled: false,
  alerts_push_enabled: true,
  account_alerts_push_enabled: true,
  billing_alerts_push_enabled: true,
  approval_alerts_push_enabled: true,
  safety_alerts_push_enabled: true,
  support_alerts_push_enabled: true,
  policy_alerts_push_enabled: true,
  listings_near_me_push_enabled: false,
  listings_near_me_radius_miles: 2,
  vendor_near_me_push_enabled: false,
  vendor_near_me_radius_miles: 2,
  marketing_push_enabled: false
};

const recordTimestamp = (record) => {
  const value = record?.last_updated_at || record?.updated_at || record?.updated_date || record?.created_at || record?.created_date;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};
const newestRecord = (records = []) => [...records].sort((a, b) => recordTimestamp(b) - recordTimestamp(a))[0] || null;

const pushErrorMessage = (status) => status === "needs_install" ? "Install Yardit to your Home Screen first, then open the installed app to enable push notifications." :
  status === "onesignal_not_ready" ? "The push service is still loading. Please wait a few seconds and try again." :
  status === "registration_timeout" ? "Notifications were allowed, but browser registration did not finish. Refresh Yardit and try again." :
  status === "service_worker_not_ready" ? "Preparing notifications, please try again in a moment." :
  status === "blocked" ? "Notifications are blocked in your browser or device settings." :
  status === "unsupported" ? "Push notifications are not supported by this browser or device." :
  "Push permission was not completed. Please try again.";

export default function NotificationPushSettings({ user, onVerifyAddress }) {
  const queryClient = useQueryClient();
  const [browserStatus, setBrowserStatus] = useState("not_enabled");
  const [runtimeSubscriptionId, setRuntimeSubscriptionId] = useState("");
  const [runtimeConnected, setRuntimeConnected] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const verifiedAddress = hasVerifiedPrimaryAddress(user);

  const refreshRuntimeConnection = async () => {
    const runtime = await getRuntimePushConnection();
    setBrowserStatus(runtime.connected ? "enabled" : runtime.browserStatus);
    setRuntimeSubscriptionId(runtime.subscriptionId || "");
    setRuntimeConnected(runtime.connected === true);
    return runtime;
  };

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const runtime = await getRuntimePushConnection();
      if (cancelled) return;
      setBrowserStatus(runtime.connected ? "enabled" : runtime.browserStatus);
      setRuntimeSubscriptionId(runtime.subscriptionId || "");
      setRuntimeConnected(runtime.connected === true);
    };
    refresh();
    const handleReady = () => refresh();
    const handleFocus = () => refresh();
    window.addEventListener("yardit:onesignal-ready", handleReady);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("yardit:onesignal-ready", handleReady);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const { data: preference } = useQuery({
    queryKey: ["notificationPreference", user?.id],
    queryFn: async () => newestRecord(await base44.entities.NotificationPreference.filter({ user_id: user.id })),
    enabled: !!user?.id,
  });

  const { data: pushSubscriptions = [] } = useQuery({
    queryKey: ["pushSubscription", user?.id],
    queryFn: async () => await base44.entities.PushSubscription.filter({ user_id: user.id }),
    enabled: !!user?.id,
    initialData: [],
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
    const currentUserAgent = navigator.userAgent;
    const matching = existing.find((row) => subscriptionId && row.onesignal_subscription_id === subscriptionId)
      || existing.find((row) => row.user_agent === currentUserAgent);
    const data = { user_id: user.id, onesignal_subscription_id: subscriptionId, permission_status: status, is_active: status === "enabled", user_agent: currentUserAgent, updated_at: new Date().toISOString() };
    if (matching) await base44.entities.PushSubscription.update(matching.id, data);
    else await base44.entities.PushSubscription.create({ ...data, created_at: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ["pushSubscription", user?.id] });
  };

  useEffect(() => {
    if (!user?.id || !runtimeConnected || !runtimeSubscriptionId) return;
    const matching = pushSubscriptions.find((row) => row.onesignal_subscription_id === runtimeSubscriptionId && row.is_active === true && row.permission_status === "enabled");
    if (!matching) savePushSubscription("enabled", runtimeSubscriptionId);
  }, [user?.id, runtimeConnected, runtimeSubscriptionId, pushSubscriptions]);

  const ensurePushPermissionForOptIn = async ({ showSuccess = false } = {}) => {
    if (!user?.id) return false;

    const runtime = await refreshRuntimeConnection();
    const storedMatch = runtime.subscriptionId
      ? pushSubscriptions.find((row) => row.onesignal_subscription_id === runtime.subscriptionId && row.permission_status === "enabled" && row.is_active === true)
      : null;
    if (runtime.connected && storedMatch) {
      if (!preference?.push_enabled) await saveMutation.mutateAsync({ push_enabled: true });
      if (showSuccess) toast.success("This device is connected for Yardit push notifications");
      return true;
    }

    setEnabling(true);
    try {
      const result = await enableOneSignalPush({ userId: user.id });
      const subscriptionId = result.subscriptionId || await getOneSignalSubscriptionId();
      if (canStorePushStatus(result.status)) await savePushSubscription(result.status, subscriptionId);

      if (result.status === "enabled" && subscriptionId) {
        setBrowserStatus("enabled");
        setRuntimeSubscriptionId(subscriptionId);
        setRuntimeConnected(true);
        localStorage.removeItem("yardit_last_push_error");
        await saveMutation.mutateAsync({ push_enabled: true });
        if (showSuccess) toast.success("This device is now connected for Yardit push notifications");
        return true;
      }
      setBrowserStatus(result.status);

      const errorMessage = pushErrorMessage(result.status);
      localStorage.setItem("yardit_last_push_error", errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setEnabling(false);
    }
  };

  const handleEnablePush = async () => {
    await ensurePushPermissionForOptIn({ showSuccess: true });
  };

  const pref = { ...defaults, ...(preference || {}) };
  const storedCurrentDevice = runtimeSubscriptionId
    ? pushSubscriptions.find((row) => row.onesignal_subscription_id === runtimeSubscriptionId && row.permission_status === "enabled" && row.is_active === true)
    : null;
  const displayStatus = runtimeConnected && storedCurrentDevice ? "enabled" : browserStatus === "permission_granted" ? "not_connected" : browserStatus;
  const showEnableButton = displayStatus !== "enabled";
  const disableEnableButton = enabling || browserStatus === "unsupported" || browserStatus === "needs_install";
  const enableButtonLabel = displayStatus === "not_connected" ? "Repair Push Connection" : browserStatus === "blocked" ? "Notifications Blocked" : "Enable Push Notifications";

  const guardedToggle = async (field, value) => {
    if ((field === "listings_near_me_push_enabled" || field === "vendor_near_me_push_enabled") && value && !verifiedAddress) {
      localStorage.setItem("yardit_pending_push_intent", field);
      onVerifyAddress?.();
      return;
    }
    if (value) {
      const allowed = await ensurePushPermissionForOptIn();
      if (!allowed) return;
    }
    saveMutation.mutate({ [field]: value });
  };

  return <Card className="border-2 border-[#5DADA5]/30 shadow-sm">
    <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Bell className="h-5 w-5" /> Notification Settings</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-slate-600">Choose which notifications you want sent as push alerts. Turning on any push category will first ask this browser/device for notification permission if Yardit is not already connected. These settings do not remove notifications from your Yardit notification history.</p>
      <div className="flex flex-col gap-3 rounded-2xl bg-[#F3E6CF] p-4 sm:flex-row sm:items-center sm:justify-between">
       <div><p className="font-bold text-[#2C4F4E]">Push permission: {pushStatusLabel(displayStatus)}</p><p className="text-xs text-slate-600">Bell/history notifications are always kept separately.</p>{displayStatus === "not_connected" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">Your browser already allows notifications, but this device is not currently connected to OneSignal. Tap Repair Push Connection.</p>}{browserStatus === "blocked" && <p className="mt-1 text-xs font-semibold text-red-700">Notifications are blocked for Yardit in your browser/device settings. Browsers do not allow Yardit to reopen that permission prompt after you block it; allow Yardit notifications in your device/browser settings, return here, then tap Enable again.</p>}{browserStatus === "needs_install" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">On iPhone or iPad, install Yardit to your Home Screen first, open the installed Yardit app, then enable notifications here.</p>}{browserStatus === "onesignal_not_ready" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">The push service is still loading. Wait a few seconds and tap Enable again.</p>}{browserStatus === "service_worker_not_ready" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">Preparing the notification service. Please try again in a moment.</p>}</div>
       {showEnableButton && <Button onClick={handleEnablePush} disabled={disableEnableButton} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">{enabling && <Loader2 className="h-4 w-4 animate-spin" />} {enableButtonLabel}</Button>}
      </div>
      <PushDebugPanel user={user} storedSubscriptionId={pushSubscription?.onesignal_subscription_id} />
      <AlertsPushGroup
        pref={pref}
        onGroupChange={(v) => guardedToggle("alerts_push_enabled", v)}
        onItemChange={(field, value) => guardedToggle(field, value)}
        disabled={enabling}
      />
      <PushCategoryRow title="Listings Near Me" description="Get push alerts when new yard sales, neighborhood sales, or events appear near your verified address." checked={pref.listings_near_me_push_enabled} disabled={enabling} onCheckedChange={(v) => guardedToggle("listings_near_me_push_enabled", v)} radius={pref.listings_near_me_radius_miles} onRadiusChange={(v) => saveMutation.mutate({ listings_near_me_radius_miles: v })} note={!verifiedAddress ? "Requires a verified address." : ""} />
      <PushCategoryRow title="Vendor Check-Ins Near Me" description="Get push alerts when vendors check in near your verified address." checked={pref.vendor_near_me_push_enabled} disabled={enabling} onCheckedChange={(v) => guardedToggle("vendor_near_me_push_enabled", v)} radius={pref.vendor_near_me_radius_miles} onRadiusChange={(v) => saveMutation.mutate({ vendor_near_me_radius_miles: v })} note={!verifiedAddress ? "Requires a verified address." : ""} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h4 className="mb-2 font-bold text-[#2C4F4E]">Vendor Subscriptions</h4><VendorSubscriptionManager user={user} /></div>
    </CardContent>
  </Card>;
}