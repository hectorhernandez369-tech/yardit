import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, Loader2 } from "lucide-react";

export default function SystemSettings() {
  const queryClient = useQueryClient();
  const [showDemoModeInfo, setShowDemoModeInfo] = React.useState(false);

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentUserForSystemSettings"],
    queryFn: () => base44.auth.me(),
  });

  const { data: adminProfiles = [], isLoading: isLoadingAdminProfile } = useQuery({
    queryKey: ["systemSettingsAdminProfile", currentUser?.id],
    queryFn: async () => {
      const byUserId = await base44.entities.AdminProfile.filter({ user_id: currentUser.id });
      if (byUserId.length > 0) return byUserId;
      return await base44.entities.AdminProfile.filter({ email: currentUser.email.toLowerCase() });
    },
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSetting.list(),
  });

  const appModeSetting = settings?.find(s => s.key === "app_mode");
  const isDemo = appModeSetting?.value === "demo";

  const toggleMutation = useMutation({
    mutationFn: async (newValue) => {
      const mode = newValue ? "demo" : "live";
      if (appModeSetting) {
        await base44.entities.AppSetting.update(appModeSetting.id, { value: mode });
      } else {
        await base44.entities.AppSetting.create({ key: "app_mode", value: mode });
      }
    },
    onSuccess: (_data, newValue) => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success("App mode updated");
      if (newValue) {
        setShowDemoModeInfo(true);
      }
    }
  });

  const deleteDemosMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("deleteDemoListings");
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success(`Deleted ${data.deletedCount} demo listing(s)`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete demo listings");
    }
  });

  const canManageDemoMode = adminProfiles[0]?.role_label === "master";

  const vendorSignupSetting = settings?.find((s) => s.key === "vendor_public_signup_enabled");
  const vendorAllowlistSetting = settings?.find((s) => s.key === "vendor_beta_allowlist");
  const isPublicSignupEnabled = String(vendorSignupSetting?.value || "").toLowerCase() === "true";
  const [allowlistDraft, setAllowlistDraft] = React.useState("");

  React.useEffect(() => {
    setAllowlistDraft(vendorAllowlistSetting?.value || "");
  }, [vendorAllowlistSetting?.value]);

  const toggleSignupMutation = useMutation({
    mutationFn: async (newValue) => {
      const val = newValue ? "true" : "false";
      if (vendorSignupSetting) {
        await base44.entities.AppSetting.update(vendorSignupSetting.id, { value: val });
      } else {
        await base44.entities.AppSetting.create({ key: "vendor_public_signup_enabled", value: val });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      queryClient.invalidateQueries({ queryKey: ["vendorLaunchGateSettings"] });
      toast.success("Vendor signup setting updated");
    },
  });

  const saveAllowlistMutation = useMutation({
    mutationFn: async (value) => {
      if (vendorAllowlistSetting) {
        await base44.entities.AppSetting.update(vendorAllowlistSetting.id, { value });
      } else {
        await base44.entities.AppSetting.create({ key: "vendor_beta_allowlist", value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      queryClient.invalidateQueries({ queryKey: ["vendorLaunchGateSettings"] });
      toast.success("Vendor beta allowlist updated");
    },
  });

  if (isLoading || isLoadingUser || isLoadingAdminProfile) return <div className="p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!canManageDemoMode) return null;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-semibold">Global App Mode</p>
              <p className="text-sm text-slate-600">
                When Demo is enabled, testing behavior applies to admin accounts only. Admins can skip payment at checkout or continue to Stripe.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={!isDemo ? "font-bold text-slate-800" : "text-slate-500"}>Live</span>
              <Switch 
                checked={isDemo} 
                onCheckedChange={(c) => toggleMutation.mutate(c)} 
                disabled={toggleMutation.isPending}
              />
              <span className={isDemo ? "font-bold text-blue-600" : "text-slate-500"}>Demo</span>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Public Vendor Signup</p>
                <p className="text-sm text-slate-600">
                  Temporarily gate public Vendor Account creation during the Residential launch. Existing vendors, allowlisted beta users, and admins still have access.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={!isPublicSignupEnabled ? "font-bold text-slate-800" : "text-slate-500"}>Off</span>
                <Switch checked={isPublicSignupEnabled} onCheckedChange={(c) => toggleSignupMutation.mutate(c)} disabled={toggleSignupMutation.isPending} />
                <span className={isPublicSignupEnabled ? "font-bold text-green-600" : "text-slate-500"}>On</span>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-800">Beta Allowlist</p>
              <p className="text-xs text-slate-500">One email or user ID per line, or a JSON array. Emails are matched case-insensitively.</p>
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-slate-200 p-2 text-sm font-mono"
                value={allowlistDraft}
                onChange={(e) => setAllowlistDraft(e.target.value)}
                placeholder={"alice@example.com\nbob@example.com"}
              />
              <Button size="sm" disabled={saveAllowlistMutation.isPending} onClick={() => saveAllowlistMutation.mutate(allowlistDraft)}>
                {saveAllowlistMutation.isPending ? "Saving..." : "Save Allowlist"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="font-semibold text-red-900">Delete Demo Data</p>
              <p className="text-sm text-red-700">
                Permanently delete all listings flagged as demo (and their related records).
              </p>
            </div>
            <Button 
              variant="destructive"
              disabled={deleteDemosMutation.isPending}
              onClick={() => {
                if (window.confirm("Are you sure you want to delete all demo listings? This cannot be undone.")) {
                  deleteDemosMutation.mutate();
                }
              }}
            >
              {deleteDemosMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Demo Listings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDemoModeInfo} onOpenChange={setShowDemoModeInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Demo Mode is now on</DialogTitle>
                <DialogDescription>Here is what changes while Demo Mode is active.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Address testing is unlocked</p>
              <p>You can select test addresses more freely while creating listings.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">One-listing test limit is unlocked</p>
              <p>You can create more test listings without the normal testing restriction.</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold">Admins choose payment behavior</p>
              <p>Before Stripe checkout, admins can skip payment for testing or continue to Stripe to test the real payment flow.</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDemoModeInfo(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}