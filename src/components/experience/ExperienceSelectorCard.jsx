import React, { useState } from "react";
import { CalendarDays, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EVENTS_EXPERIENCE_AVAILABLE, getPreferredExperience, RESIDENTIAL_EXPERIENCE, setPreferredExperience } from "@/lib/experience";

export default function ExperienceSelectorCard() {
  const [selected, setSelected] = useState(getPreferredExperience());

  const chooseYardit = () => {
    setPreferredExperience(RESIDENTIAL_EXPERIENCE);
    setSelected(RESIDENTIAL_EXPERIENCE);
  };

  return (
    <Card className="mb-6 border-[#2C4F4E]/15 bg-white/95 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="font-black text-[#2C4F4E]">Experience</p>
          <p className="text-sm text-slate-600">Choose your default landing experience for this device.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant={selected === RESIDENTIAL_EXPERIENCE ? "default" : "outline"} onClick={chooseYardit} className="justify-start gap-2"><Home className="h-4 w-4" /> Yardit</Button>
          <Button disabled={!EVENTS_EXPERIENCE_AVAILABLE} variant="outline" className="justify-start gap-2 cursor-not-allowed opacity-60 grayscale"><CalendarDays className="h-4 w-4" /> Yardit Events — Coming Soon</Button>
        </div>
      </CardContent>
    </Card>
  );
}
