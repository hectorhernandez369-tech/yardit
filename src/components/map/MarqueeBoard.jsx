import React from "react";
import { Button } from "@/components/ui/button";
import { getVisibleMarqueeSlots, formatMarqueeSlotTime } from "@/lib/marqueeSchedule";

export default function MarqueeBoard({ listing, onClose, onViewDetails }) {
  if (!listing) return null;

  const title = listing.event_name || listing.title || "Event";
  const slots = getVisibleMarqueeSlots(listing).slice(0, 4);

  return (
    <div className="pointer-events-auto">
      <div className="relative w-[114px] rounded-lg border border-[#f4a849] bg-gradient-to-b from-[#7c2d12] to-[#3f1d0b] px-1.5 pb-0.5 pt-0.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute left-1.5 right-1.5 top-[-3px] flex justify-between">
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={`top-bulb-${index}`} className="h-1.5 w-1.5 rounded-full bg-[#FFF3B0] shadow-[0_0_4px_rgba(255,230,128,0.9)]" />
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-0.5 left-[-3px] top-0.5 flex flex-col justify-between">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={`left-bulb-${index}`} className="h-1.5 w-1.5 rounded-full bg-[#FFE08A] shadow-[0_0_4px_rgba(255,220,120,0.8)]" />
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-0.5 right-[-3px] top-0.5 flex flex-col justify-between">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={`right-bulb-${index}`} className="h-1.5 w-1.5 rounded-full bg-[#FFE08A] shadow-[0_0_4px_rgba(255,220,120,0.8)]" />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-1 top-0.5 rounded-full bg-black/25 px-1 py-0 text-[8px] font-bold text-white hover:bg-black/40"
        >
          X
        </button>

        <div className="pr-4 pt-0 text-center text-[7px] font-black uppercase leading-tight tracking-[0.03em] break-words">
          {title}
        </div>

        <div className="mt-0.5 grid gap-0.5">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between gap-1 rounded-sm bg-white/10 px-1 py-[1px] text-[6px] leading-tight">
              <span className="min-w-0 truncate font-bold">{slot.label || "Schedule"}</span>
              <span className="shrink-0 whitespace-nowrap text-[#FDE68A]">{formatMarqueeSlotTime(slot) || "Time TBD"}</span>
            </div>
          ))}
        </div>

        <Button
          size="sm"
          onClick={onViewDetails}
          className="mt-0.5 h-4 w-full bg-amber-600 px-1 py-0 text-[7px] hover:bg-amber-700"
        >
          View More Details
        </Button>
      </div>
    </div>
  );
}