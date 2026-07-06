import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, MapPin, Users, Megaphone, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getUserVendorAccounts } from "@/lib/getUserVendorAccounts";

export default function VendorAccountIntro() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const organizerType = urlParams.get("organizer") || localStorage.getItem("yardit_organizer_account_type") || "vendor_event";
  const dashboardPath = organizerType === "league_team" ? "/LeagueTeamDashboard" : "/VendorDashboard";
  const [checking, setChecking] = useState(true);
  const [alreadyHasAccount, setAlreadyHasAccount] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (user) => {
      const accounts = await getUserVendorAccounts(user, { organizerType });
      if (accounts.length > 0) {
        setAlreadyHasAccount(true);
        setTimeout(() => navigate(dashboardPath), 2500);
      }
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5DADA5]" />
      </div>
    );
  }

  if (alreadyHasAccount) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F3E6CF] flex items-center justify-center p-4">
        <Card className="border-2 border-[#2C4F4E] bg-white shadow-xl max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Store className="w-12 h-12 text-[#5DADA5] mx-auto" />
            <h2 className="text-xl font-bold text-[#2C4F4E]">You already have a Vendor account.</h2>
            <p className="text-slate-500 text-sm">Redirecting you to your dashboard...</p>
            <Button onClick={() => navigate(dashboardPath)} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F3E6CF] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-2 border-[#2C4F4E] bg-white shadow-xl">
          <CardHeader className="bg-[#5DADA5] text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Store className="w-6 h-6" />
              Open a Vendor Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <p className="text-[#2C4F4E] text-lg leading-relaxed">
              Vendor accounts are for food trucks, mobile sellers, local businesses, and event vendors who want more ways to be discovered on Yardit.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#2C4F4E]/20 bg-[#F3E6CF] p-4">
                <MapPin className="w-6 h-6 text-[#5DADA5] mb-2" />
                <h3 className="font-semibold text-[#2C4F4E]">Show live locations</h3>
                <p className="text-sm text-slate-700 mt-1">Create vendor pins so customers can find you faster.</p>
              </div>
              <div className="rounded-xl border border-[#2C4F4E]/20 bg-[#F3E6CF] p-4">
                <Megaphone className="w-6 h-6 text-[#F4A849] mb-2" />
                <h3 className="font-semibold text-[#2C4F4E]">Promote your business</h3>
                <p className="text-sm text-slate-700 mt-1">Share photos, updates, and business details.</p>
              </div>
              <div className="rounded-xl border border-[#2C4F4E]/20 bg-[#F3E6CF] p-4">
                <Users className="w-6 h-6 text-[#5DADA5] mb-2" />
                <h3 className="font-semibold text-[#2C4F4E]">Join events</h3>
                <p className="text-sm text-slate-700 mt-1">Request to join vendor events and manage attendance.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={() => navigate(`/VendorSignup?organizer=${organizerType}`)} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold">
                Continue to Setup
              </Button>
              <Button variant="outline" onClick={() => navigate("/Profile")} className="border-[#2C4F4E] text-[#2C4F4E]">
                Back to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}