import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";

export default function VendorLaunchGate() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F3E6CF] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-2 border-[#2C4F4E] bg-white shadow-xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#5DADA5]/10 flex items-center justify-center">
            <Store className="h-7 w-7 text-[#2C4F4E]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2C4F4E]">Vendor Accounts Are Coming Soon</h2>
          <p className="text-sm text-slate-600">
            Yardit is currently launching Residential Yard Sales, Neighborhood Sales, and local Residential Events.
            Vendor Accounts and Vendor Events will open in a future release.
          </p>
          <p className="text-xs text-slate-500">
            Already have an approved Vendor Account? Sign in with the Yardit account connected to it.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate("/")} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
              Back to Yardit
            </Button>
            <Button variant="outline" onClick={() => navigate("/ContactSupport")} className="w-full border-[#2C4F4E] text-[#2C4F4E]">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}