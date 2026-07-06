import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy } from "lucide-react";

export default function OrganizerAccountDialog({ open, onOpenChange, hasVendorAccount }) {
  const navigate = useNavigate();

  const openOrganizerPath = (type) => {
    localStorage.setItem("yardit_organizer_account_type", type);
    onOpenChange(false);
    if (type === "league_team") {
      navigate(hasVendorAccount ? "/LeagueTeamDashboard" : "/VendorAccountIntro?organizer=league_team");
      return;
    }
    navigate(hasVendorAccount ? "/VendorDashboard" : "/VendorAccountIntro?organizer=vendor_event");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#2C4F4E]">Choose Organizer Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button onClick={() => openOrganizerPath("vendor_event")} variant="outline" className="h-auto w-full justify-start gap-3 rounded-xl border-[#2C4F4E]/25 p-4 text-left">
            <CalendarDays className="h-5 w-5 text-[#5DADA5]" />
            <span>
              <span className="block font-bold text-[#2C4F4E]">Vendor / Event Organizer</span>
              <span className="block text-xs text-slate-500">Manage vendors, pins, and events.</span>
            </span>
          </Button>
          <Button onClick={() => openOrganizerPath("league_team")} variant="outline" className="h-auto w-full justify-start gap-3 rounded-xl border-[#2C4F4E]/25 p-4 text-left">
            <Trophy className="h-5 w-5 text-[#F4A849]" />
            <span>
              <span className="block font-bold text-[#2C4F4E]">League / Team Organizer</span>
              <span className="block text-xs text-slate-500">Manage teams and games.</span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}