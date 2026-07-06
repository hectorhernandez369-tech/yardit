import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export default function LeagueTeamsTab({ account }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Users className="h-5 w-5" /> Teams</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Teams for {account?.business_name || "this organization"} will be managed here.</p>
        <Button className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Add Team</Button>
      </CardContent>
    </Card>
  );
}