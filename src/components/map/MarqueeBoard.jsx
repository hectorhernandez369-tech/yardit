import React from "react";
import { Button } from "@/components/ui/button";
import { getVisibleMarqueeSlots, formatMarqueeSlotTime } from "@/lib/marqueeSchedule";

export default function MarqueeBoard({ listing, onClose, onViewDetails }) {
  if (!listing) return null;

  const title = listing?.event_name || listing?.title || "Event";
  const safeSlots = (() => {
    try {
      const slots = getVisibleMarqueeSlots(listing);
      return Array.isArray(slots) ? slots.slice(0, 4) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="pointer-events-auto" style={{ transform: "translate(-50%, calc(-100% - 18px))" }}>
      <div className="relative w-[230px] min-h-[140px] rounded-lg border border-[#f4a849] bg-gradient-to-b from-[#7c2d12] to-[#3f1d0b] px-3 pb-3 pt-2 text-white shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
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
          className="absolute right-2 top-2 rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-black/40"
        >
          X
        </button>

        <div className="pr-8 text-center text-[12px] font-black uppercase leading-tight tracking-[0.03em] break-words">
          {title}
        </div>

        {safeSlots.length > 0 && (
          <div className="mt-3 grid gap-1">
            {safeSlots.map((slot) => (
              <div key={slot.id || slot.label} className="flex min-h-[22px] items-center justify-between gap-2 rounded-sm bg-white/10 px-2 py-1 text-[10px] leading-tight">
                <span className="min-w-0 truncate font-bold">{slot.label || "Schedule"}</span>
                <span className="shrink-0 whitespace-nowrap text-[#FDE68A]">{formatMarqueeSlotTime(slot) || "Time TBD"}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          size="sm"
          onClick={onViewDetails}
          className="mt-3 h-8 w-full bg-amber-600 px-2 py-0 text-[10px] hover:bg-amber-700"
        >
          View More Details
        </Button>
      </div>
      <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[7px] border-l-transparent border-r-transparent border-t-[#3f1d0b] drop-shadow-[0_2px_2px_rgba(0,0,0,0.28)]" />
    </div>
  );
}