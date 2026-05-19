import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

/**
 * Shown when a user navigates to /VendorDashboard but has no vendor account access.
 */
export default function VendorAccessDenied() {
  const navigate = useNavigate();
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
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate("/VendorAccountIntro")} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
              Open a Vendor Account
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Back to Map
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}