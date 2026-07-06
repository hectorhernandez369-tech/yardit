import React from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function LeagueAccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border border-slate-200 shadow-xl">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Shield className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-[#2C4F4E]">No Organizer Access</h2>
          <p className="text-sm text-slate-500">Open an organizer account to use the League / Team Dashboard.</p>
          <Button onClick={() => navigate("/VendorAccountIntro?organizer=league_team")} className="w-full bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Open Organizer Account</Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">Back to Map</Button>
        </CardContent>
      </Card>
    </div>
  );
}