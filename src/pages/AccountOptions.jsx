import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export default function AccountOptions() {
  const navigate = useNavigate();

  const handleSignup = () => {
    window.location.href = `/login?redirect_url=${encodeURIComponent(window.location.origin)}`;
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center bg-[#F3E6CF] px-4 py-8">
      <Card className="w-full max-w-md border-2 border-[#2C4F4E]/20 bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#2C4F4E]">Join Yardit</CardTitle>
          <CardDescription>Create a free account to save listings, use Hunt features, and post when you’re ready.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleSignup} className="w-full bg-[#111827] hover:bg-[#1f2937]">
            <UserPlus className="h-4 w-4" />
            Log In / Sign Up
          </Button>
          <Button onClick={() => navigate(-1)} variant="ghost" className="w-full text-slate-600">
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}