import React from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, UserPlus } from "lucide-react";

export default function AccountOptions() {
  const navigate = useNavigate();

  const handlePersonalSignup = () => {
    base44.auth.redirectToLogin(window.location.origin);
  };

  const handleVendorSignup = () => {
    base44.auth.redirectToLogin(`${window.location.origin}/VendorSignup`);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center bg-[#F3E6CF] px-4 py-8">
      <Card className="w-full max-w-md border-2 border-[#2C4F4E]/20 bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#2C4F4E]">Join Yardit</CardTitle>
          <CardDescription>Choose the account type that fits you best.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handlePersonalSignup} className="w-full bg-[#111827] hover:bg-[#1f2937]">
            <UserPlus className="h-4 w-4" />
            Personal Account
          </Button>
          <Button onClick={handleVendorSignup} variant="outline" className="w-full border-[#2C4F4E]/40 text-[#2C4F4E] hover:bg-[#F3E6CF]">
            <Store className="h-4 w-4" />
            Create Vendor Account
          </Button>
          <Button onClick={() => navigate(-1)} variant="ghost" className="w-full text-slate-600">
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}