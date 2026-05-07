import React from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Sparkles } from "lucide-react";

export default function QuickActions({ isLive, onCheckIn, onEditProfile, onTier }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Button onClick={onCheckIn} className="h-12 rounded-xl bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">
        <MapPin className="w-4 h-4" /> {isLive ? "Manage Live Pin" : "Check In"}
      </Button>
      <Button onClick={onEditProfile} variant="outline" className="h-12 rounded-xl">
        <Pencil className="w-4 h-4" /> Edit Profile
      </Button>
      <Button onClick={onTier} variant="outline" className="h-12 rounded-xl">
        <Sparkles className="w-4 h-4" /> Upgrade Tier
      </Button>
    </div>
  );
}