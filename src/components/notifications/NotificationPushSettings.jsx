import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { canStorePushStatus, enableOneSignalPush, getBrowserPushStatus, getOneSignalSubscriptionId, pushStatusLabel } from "@/lib/pushNotifications";
import { hasVerifiedPrimaryAddress } from "@/lib/trustActions";
import { isPlayStoreWebWrapper, openWebPushSetup } from "@/lib/webPushHandoff";
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

const pushErrorMessage = (status) => status === "needs_install" ? "Install Yardit to your Home Screen first, then open the installed app to enable push notifications." :
  status === "onesignal_not_ready" ? "The push service is still loading. Please wait a few seconds and try again." :
  status === "registration_timeout" ? "Notifications were allowed, but browser registration did not finish. Refresh Yardit and try again." :
  status === "service_worker_not_ready" ? "Preparing notifications, please try again in a moment." :
  status === "blocked" ? "Notifications are blocked for Yardit in this browser. Open the browser's site settings, allow notifications, then return here." :
  status === "unsupported" ? "Push notifications are not supported by this browser or device." :
  "Push permission was not completed. Please try again.";

export default function NotificationPushSettings({ user, onVerifyAddress }) {
  const queryClient = useQueryClient();
  const playWrapper = isPlayStoreWebWrapper();
  const focusedSetup = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pushSetup") === "1";
  const [browserStatus, setBrowserStatus] = useState(playWrapper ? "web_handoff" : "not_enabled");
  const [enabling, setEnabling] = useState(false);
  const verifiedAddress = hasVerifiedPrimaryAddress(user);

  useEffect(() => {
    setBrowserStatus(playWrapper ? "web_handoff" : getBrowserPushStatus());
  }, [playWrapper]);

  const { data: preference } = useQuery({
    queryKey: ["notificationPreference", user?.id],
    queryFn: async () => (await base44.entities.NotificationPreference.filter({ user_id: user.id }))[0] || null,
    enabled: !!user?.id,
  });

  const { data: pushSubscription } = useQuery({
    queryKey: ["pushSubscription", user?.id],
    queryFn: async () => (await base44.entities.PushSubscription.filter({ user_id: user.id }))[0] || null,
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
    queryClient.invalidateQueries({ queryKey: ["pushSubscription", user?.id] });
  };

  useEffect(() => {
    if (playWrapper || !user?.id || browserStatus !== "enabled") return;
    enableOneSignalPush({ userId: user.id }).then((result) => {
      if (result.status === "enabled" && result.subscriptionId) savePushSubscription("enabled", result.subscriptionId);
      else if (result.status !== "enabled") setBrowserStatus(result.status);
    });
  }, [user?.id, browserStatus, playWrapper]);

  const ensurePushPermissionForOptIn = async ({ showSuccess = false } = {}) => {
    if (!user?.id) return false;

    const currentlyConnected = pushSubscription?.permission_status === "enabled" && pushSubscription?.is_active === true && !!pushSubscription?.onesignal_subscription_id;
    if (currentlyConnected) {
      if (!preference?.push_enabled) await saveMutation.mutateAsync({ push_enabled: true });
      if (showSuccess) toast.success("Push notifications are enabled for your Yardit account");
      return true;
    }

    if (playWrapper) {
      const opened = openWebPushSetup();
      if (opened) toast.message("Allow notifications in the browser to finish setup.");
      else toast.error("Could not open Yardit in your browser.");
      return false;
    }

    setEnabling(true);
    try {
      const result = await enableOneSignalPush({ userId: user.id });
      setBrowserStatus(result.status);
      const subscriptionId = result.subscriptionId || await getOneSignalSubscriptionId();
      if (canStorePushStatus(result.status)) await savePushSubscription(result.status, subscriptionId);

      if (result.status === "enabled" && subscriptionId) {
        localStorage.removeItem("yardit_last_push_error");
        await saveMutation.mutateAsync({ push_enabled: true });
        if (showSuccess) toast.success("Push notifications enabled");
        return true;
      }

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
  const hasConnectedSubscription = pushSubscription?.permission_status === "enabled" && pushSubscription?.is_active === true && !!pushSubscription?.onesignal_subscription_id;
  const displayStatus = hasConnectedSubscription ? "enabled" : playWrapper ? "web_handoff" : browserStatus === "enabled" ? "not_connected" : browserStatus;
  const showEnableButton = displayStatus !== "enabled";
  const disableEnableButton = enabling || (!playWrapper && (browserStatus === "blocked" || browserStatus === "unsupported" || browserStatus === "needs_install"));

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

  if (focusedSetup) {
    const blocked = browserStatus === "blocked";
    const enabled = displayStatus === "enabled";

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#F3E6CF] p-5">
        <Card className="w-full max-w-md border-2 border-[#2C4F4E] shadow-xl">
          <CardContent className="p-7 text-center">
            {enabled ? (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-9 w-9 text-green-600" />
                </div>
                <h1 className="text-2xl font-black text-[#2C4F4E]">Notifications enabled</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">You’re all set. Yardit can now send web push alerts to this device.</p>
                <p className="mt-4 text-sm font-semibold text-[#2C4F4E]">You can return to Yardit.</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F4A849]/20">
                  <Bell className="h-9 w-9 text-[#2C4F4E]" />
                </div>
                <h1 className="text-2xl font-black text-[#2C4F4E]">Enable Yardit notifications</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Tap the button below, then choose <strong>Allow</strong> when your browser asks about notifications.
                </p>
                {blocked && (
                  <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                    Notifications were previously blocked for Yardit in this browser. You’ll need to allow them in this browser’s site settings, then come back here.
                  </p>
                )}
                {!blocked && browserStatus === "unsupported" && (
                  <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">This browser does not support Yardit web notifications.</p>
                )}
                <Button
                  onClick={handleEnablePush}
                  disabled={disableEnableButton}
                  className="mt-6 w-full bg-[#F4A849] py-6 text-base font-black text-[#2C4F4E] hover:bg-[#E39635]"
                >
                  {enabling && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Enable Notifications
                </Button>
                <p className="mt-3 text-xs text-slate-500">No extra Yardit settings are required.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Card className="border-2 border-[#5DADA5]/30 shadow-sm">
    <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Bell className="h-5 w-5" /> Notification Settings</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-slate-600">
        {playWrapper
          ? "Push alerts for the Play Store version are enabled through Yardit on the web. Tap Enable Notifications and Yardit will open the browser setup for you."
          : "Choose which notifications you want sent as push alerts. Turning on any push category will first ask this browser/device for notification permission if Yardit is not already connected. These settings do not remove notifications from your Yardit notification history."}
      </p>
      <div className="flex flex-col gap-3 rounded-2xl bg-[#F3E6CF] p-4 sm:flex-row sm:items-center sm:justify-between">
       <div>
         <p className="font-bold text-[#2C4F4E]">Push permission: {displayStatus === "web_handoff" ? "Ready to enable" : pushStatusLabel(displayStatus)}</p>
         <p className="text-xs text-slate-600">Bell/history notifications are always kept separately.</p>
         {playWrapper && !hasConnectedSubscription && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">Tap Enable Notifications. Yardit will open the web setup directly—no menu navigation needed.</p>}
         {!playWrapper && displayStatus === "not_connected" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">Your browser allowed notifications, but Yardit still needs to connect this device to your account.</p>}
         {!playWrapper && browserStatus === "needs_install" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">On iPhone or iPad, install Yardit to your Home Screen first, then open the installed app to enable push.</p>}
         {!playWrapper && browserStatus === "onesignal_not_ready" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">The push service is still loading. Wait a few seconds, then try again.</p>}
         {!playWrapper && browserStatus === "service_worker_not_ready" && <p className="mt-1 text-xs font-semibold text-[#2C4F4E]">Preparing notifications, please try again in a moment.</p>}
       </div>
       {showEnableButton && <Button onClick={handleEnablePush} disabled={disableEnableButton} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">
         {enabling && <Loader2 className="h-4 w-4 animate-spin" />}
         {playWrapper && !enabling && <ExternalLink className="h-4 w-4" />}
         {playWrapper ? "Enable Notifications" : displayStatus === "not_connected" ? "Connect Push Notifications" : "Enable Push Notifications"}
       </Button>}
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
