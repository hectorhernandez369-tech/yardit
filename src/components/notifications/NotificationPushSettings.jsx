import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { hasVerifiedPrimaryAddress } from "@/lib/trustActions";
import { enablePushPromptSubscription } from "@/lib/pushPromptActions";
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
  marketing_push_enabled: false,
};

export default function NotificationPushSettings({ user, onVerifyAddress }) {
  const queryClient = useQueryClient();
  const verifiedAddress = hasVerifiedPrimaryAddress(user);
  const { data: preference } = useQuery({
    queryKey: ["notificationPreference", user?.id],
    queryFn: async () => (await base44.entities.NotificationPreference.filter({ user_id: user.id }))[0] || null,
    enabled: !!user?.id,
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["pushSubscription", user?.id],
    queryFn: () => base44.entities.PushSubscription.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });
  const pushSubscription = subscriptions.find((item) => item.permission_status === "enabled" && item.is_active === true && item.onesignal_subscription_id);

  const saveMutation = useMutation({
    mutationFn: async (patch) => {
      const data = { ...defaults, ...(preference || {}), ...patch, user_id: user.id, last_updated_at: new Date().toISOString() };
      if (preference?.id) return base44.entities.NotificationPreference.update(preference.id, data);
      return base44.entities.NotificationPreference.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificationPreference", user?.id] }),
  });

  const masterPushMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!enabled) {
        const activeSubscriptions = subscriptions.filter((item) => item.is_active === true);
        await Promise.all(activeSubscriptions.map((item) => base44.entities.PushSubscription.update(item.id, {
          is_active: false,
          updated_at: new Date().toISOString(),
        })));
        const data = { ...defaults, ...(preference || {}), push_enabled: false, user_id: user.id, last_updated_at: new Date().toISOString() };
        if (preference?.id) await base44.entities.NotificationPreference.update(preference.id, data);
        else await base44.entities.NotificationPreference.create(data);
        return { status: "disabled" };
      }

      return enablePushPromptSubscription(user);
    },
    onSuccess: async (result, enabled) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notificationPreference", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["pushSubscription", user?.id] }),
      ]);
      if (!enabled) {
        toast.success("Push notifications disabled.");
        return;
      }
      if (result?.status === "web_handoff") {
        toast.message("Finish enabling notifications in the browser window that opened.");
      } else if (result?.status === "enabled") {
        toast.success("Push notifications enabled.");
      } else {
        toast.error("Push setup did not finish. Try Enable again.");
      }
    },
    onError: () => toast.error("Could not update push notifications. Please try again."),
  });

  const guardedToggle = (field, value) => {
    if ((field === "listings_near_me_push_enabled" || field === "vendor_near_me_push_enabled") && value && !verifiedAddress) {
      localStorage.setItem("yardit_pending_push_intent", field);
      onVerifyAddress?.();
      return;
    }
    if (value && !pushSubscription) {
      toast.message("Enable notifications from the Yardit prompt first.");
      return;
    }
    saveMutation.mutate({ [field]: value });
  };

  const pref = { ...defaults, ...(preference || {}) };
  const pushEnabled = pref.push_enabled === true && !!pushSubscription;
  const pushBusy = saveMutation.isPending || masterPushMutation.isPending;

  return <Card className="border-2 border-[#5DADA5]/30 shadow-sm">
    <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Bell className="h-5 w-5" /> Notification Settings</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-slate-600">Choose which enabled push alerts you want to receive. Bell/history notifications are kept separately.</p>
      <div className="rounded-2xl bg-[#F3E6CF] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-[#2C4F4E]">Push notifications</p>
            <p className="mt-1 text-xs text-slate-600">{pushEnabled ? "Enabled" : "Disabled"}</p>
          </div>
          <Switch
            checked={pushEnabled}
            disabled={pushBusy}
            onCheckedChange={(enabled) => masterPushMutation.mutate(enabled)}
            aria-label="Enable or disable push notifications"
          />
        </div>
        {!pushEnabled && <p className="mt-2 text-xs text-slate-600">Turning this on restarts Yardit’s notification setup. Play Store users will be handed off to the browser again.</p>}
      </div>
      <PushDebugPanel user={user} storedSubscriptionId={pushSubscription?.onesignal_subscription_id} />
      <AlertsPushGroup pref={pref} onGroupChange={(value) => guardedToggle("alerts_push_enabled", value)} onItemChange={guardedToggle} disabled={pushBusy} />
      <PushCategoryRow title="Listings Near Me" description="Get push alerts when new yard sales, neighborhood sales, or events appear near your verified address." checked={pref.listings_near_me_push_enabled} disabled={pushBusy} onCheckedChange={(value) => guardedToggle("listings_near_me_push_enabled", value)} radius={pref.listings_near_me_radius_miles} onRadiusChange={(value) => saveMutation.mutate({ listings_near_me_radius_miles: value })} note={!verifiedAddress ? "Requires a verified address." : ""} />
      <PushCategoryRow title="Vendor Check-Ins Near Me" description="Get push alerts when vendors check in near your verified address." checked={pref.vendor_near_me_push_enabled} disabled={pushBusy} onCheckedChange={(value) => guardedToggle("vendor_near_me_push_enabled", value)} radius={pref.vendor_near_me_radius_miles} onRadiusChange={(value) => saveMutation.mutate({ vendor_near_me_radius_miles: value })} note={!verifiedAddress ? "Requires a verified address." : ""} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h4 className="mb-2 font-bold text-[#2C4F4E]">Vendor Subscriptions</h4><VendorSubscriptionManager user={user} /></div>
    </CardContent>
  </Card>;
}
