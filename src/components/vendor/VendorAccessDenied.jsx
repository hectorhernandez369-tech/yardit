import { Shield, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { canAccessVendorSignup } from "@/lib/vendorLaunchGate";

/**
 * Shown when a user navigates to /VendorDashboard but has no vendor account access.
 */
export default function VendorAccessDenied() {
  const navigate = useNavigate();
  const { data: user } = useQuery({ queryKey: ["vendorAccessDeniedUser"], queryFn: () => base44.auth.me(), retry: false });
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["vendorLaunchGateSettings"],
    queryFn: async () => {
      const response = await base44.functions.invoke("getPublicAppSettings", {});
      return response?.data?.settings || [];
    },
    staleTime: 30000,
  });

  const canOpenVendorSignup = canAccessVendorSignup({ user, settings, vendorAccounts: [] });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#5DADA5]" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl border border-slate-200">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Shield className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-[#2C4F4E]">No Vendor Access</h2>
          <p className="text-sm text-slate-500">
            You don't have an active vendor account linked to this Yardit login.
          </p>
          {canOpenVendorSignup ? (
            <Button onClick={() => navigate("/VendorAccountIntro")} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
              <Store className="h-4 w-4" /> Open a Vendor Account
            </Button>
          ) : (
            <p className="rounded-xl bg-[#FBFAF7] p-3 text-sm font-semibold text-[#2C4F4E]">Vendor Accounts — Coming Soon</p>
          )}
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Back to Map
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}