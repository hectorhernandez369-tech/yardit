import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SystemSettings() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success("App mode updated");
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
                When Demo is enabled, address selection and the one-listing testing limit are unlocked. Payments still use the live Stripe flow.
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
    </div>
  );
}