import React from "react";
import { CalendarDays, Home, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EVENTS_EXPERIENCE_AVAILABLE, RESIDENTIAL_EXPERIENCE, setPendingExperience, YARDIT_EVENTS_LOGO_URL, YARDIT_LOGO_URL } from "@/lib/experience";

export default function ExperienceChoice({ onChoose, compact = false }) {
  const choose = (experience) => {
    setPendingExperience(experience);
    onChoose?.(experience);
  };

  return (
    <div className={`${compact ? "" : "min-h-[calc(100vh-120px)]"} flex items-center justify-center bg-[#F3E6CF] px-4 py-8`}>
      <Card className="w-full max-w-4xl overflow-hidden border-2 border-[#2C4F4E]/20 bg-white shadow-2xl">
        <CardContent className="p-5 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black text-[#2C4F4E]">How will you use Yardit?</h1>
            <p className="mt-2 text-sm text-slate-600">Choose your starting experience.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <button onClick={() => choose(RESIDENTIAL_EXPERIENCE)} className="rounded-3xl border-2 border-[#5DADA5]/30 bg-[#F3E6CF] p-5 text-left transition hover:border-[#2C4F4E] hover:shadow-lg">
              <img src={YARDIT_LOGO_URL} alt="Yardit" className="mb-4 h-16 w-auto object-contain" />
              <div className="mb-3 flex items-center gap-2 text-xl font-black text-[#2C4F4E]"><Home className="h-5 w-5" /> Yardit</div>
              <p className="text-sm text-slate-700">Find and post yard sales, neighborhood sales, and residential discoveries on the shared public map.</p>
              <span className="mt-5 block w-full rounded-md bg-[#5DADA5] px-4 py-2 text-center text-sm font-semibold text-white">Continue with Yardit</span>
            </button>

            <div aria-disabled={!EVENTS_EXPERIENCE_AVAILABLE} className="cursor-not-allowed rounded-3xl border-2 border-slate-300 bg-slate-200 p-5 text-left text-slate-500 opacity-75 grayscale">
              <img src={YARDIT_EVENTS_LOGO_URL} alt="Yardit Events" className="mb-4 h-16 w-auto object-contain opacity-60" />
              <div className="mb-3 flex items-center gap-2 text-xl font-black text-slate-600"><CalendarDays className="h-5 w-5" /> Yardit Events</div>
              <p className="text-sm text-slate-500">Manage vendors, events, leagues, teams, schedules, and organizer dashboards in a separate events workspace.</p>
              <span className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-slate-400 px-4 py-2 text-center text-sm font-semibold text-white"><Store className="h-4 w-4" /> Coming Soon</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
