import React from "react";
import { EVENTS_EXPERIENCE, YARDIT_EVENTS_LOGO_URL, YARDIT_LOGO_URL } from "@/lib/experience";

export default function YarditSplashScreen({ experience }) {
  const isEvents = experience === EVENTS_EXPERIENCE;
  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${isEvents ? "bg-slate-950 text-[#F4A849]" : "bg-black text-[#F4C542]"}`}>
      <div className="flex w-full max-w-xs flex-col items-center px-6">
        <img
          src={isEvents ? YARDIT_EVENTS_LOGO_URL : YARDIT_LOGO_URL}
          alt={isEvents ? "Yardit Events" : "Yardit"}
          className="mb-8 w-56 max-w-full object-contain"
        />
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className={`h-full w-1/3 animate-pulse rounded-full ${isEvents ? "bg-[#F4A849]" : "bg-[#F4C542]"}`} />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide">Loading {isEvents ? "YARDIT EVENTS" : "YARDIT"}...</p>
      </div>
    </div>
  );
}