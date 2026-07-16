import React, { useState } from "react";
import { CalendarDays, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EVENTS_EXPERIENCE, getPreferredExperience, RESIDENTIAL_EXPERIENCE, setPreferredExperience } from "@/lib/experience";

export default function ExperienceSelectorCard({ hasOrganizerAccount, onOpenEvents }) {
  const [selected, setSelected] = useState(getPreferredExperience());

  const choose = (experience) => {
    setPreferredExperience(experience);
    setSelected(experience);
    if (experience === EVENTS_EXPERIENCE && onOpenEvents) onOpenEvents();
  };

  return (
    <Card className="mb-6 border-[#2C4F4E]/15 bg-white/95 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="font-black text-[#2C4F4E]">Experience</p>
          <p className="text-sm text-slate-600">Choose your default landing experience for this device.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant={selected === RESIDENTIAL_EXPERIENCE ? "default" : "outline"} onClick={() => choose(RESIDENTIAL_EXPERIENCE)} className="justify-start gap-2"><Home className="h-4 w-4" /> Yardit</Button>
          <Button variant={selected === EVENTS_EXPERIENCE ? "default" : "outline"} onClick={() => choose(EVENTS_EXPERIENCE)} className="justify-start gap-2"><CalendarDays className="h-4 w-4" /> {hasOrganizerAccount ? "Yardit Events" : "Create Yardit Events account"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}