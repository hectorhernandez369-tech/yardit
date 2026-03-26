import React from "react";
import { Button } from "@/components/ui/button";
import { getVisibleMarqueeSlots, formatMarqueeSlotTime } from "@/lib/marqueeSchedule";

export default function MarqueeBoard({ listing, point, onClose, onViewDetails }) {
  if (!listing || !point || typeof point.x !== "number" || typeof point.y !== "number") return null;

  const title = listing.event_name || listing.title || "Event";
  const slots = getVisibleMarqueeSlots(listing).slice(0, 4);

  return (
    <div
      className="absolute z-[1000] pointer-events-auto"
      style={{ left: point.x, top: point.y, transform: "translate(-50%, calc(-100% - 18px))" }}
    >
      <div className="relative w-[228px] rounded-xl border-2 border-[#f4a849] bg-gradient-to-b from-[#7c2d12] to-[#3f1d0b] p-3 text-white shadow-[0_10px_22px_rgba(0,0,0,0.32)]">
        <div className="pointer-events-none absolute left-3 right-3 top-[-6px] flex justify-between">
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={`top-bulb-${index}`} className="h-2.5 w-2.5 rounded-full bg-[#fff1a8] shadow-[0_0_8px_rgba(255,241,168,0.95),0_0_14px_rgba(255,200,87,0.7)]" />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-black/40"
        >
          X
        </button>

        <div className="pr-6 text-center text-[13px] font-black uppercase leading-tight tracking-[0.03em] break-words">
          {title}
        </div>

        <div className="mt-3 grid gap-2">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between gap-2 rounded-md bg-white/10 px-2 py-1.5 text-[10px] leading-tight">
              <span className="min-w-0 truncate font-bold">{slot.label || "Schedule"}</span>
              <span className="shrink-0 whitespace-nowrap text-[#FDE68A]">{formatMarqueeSlotTime(slot) || "Time TBD"}</span>
            </div>
          ))}
        </div>

        <Button
          size="sm"
          onClick={onViewDetails}
          className="mt-3 h-7 w-full bg-amber-600 px-2 py-0 text-[11px] hover:bg-amber-700"
        >
          View More Details
        </Button>
        <div className="pointer-events-none absolute bottom-[-6px] left-3 right-3 flex justify-between">
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={`bottom-bulb-${index}`} className="h-2.5 w-2.5 rounded-full bg-[#fff1a8] shadow-[0_0_8px_rgba(255,241,168,0.95),0_0_14px_rgba(255,200,87,0.7)]" />
          ))}
        </div>
      </div>
      <div className="mx-auto h-0 w-0 border-l-[12px] border-r-[12px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#3f1d0b] drop-shadow-[0_4px_4px_rgba(0,0,0,0.28)]" />
    </div>
  );
}