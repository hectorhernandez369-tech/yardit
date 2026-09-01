import React from "react";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { HALLOWEEN_ICON_ASSETS } from "@/lib/halloweenMapIcons";

function formatDateRange(listing) {
  const start = listing.halloween_start_date || listing.selectedRangeStartDate || (listing.startDateTime ? String(listing.startDateTime).slice(0, 10) : "");
  const end = listing.halloween_end_date || listing.selectedRangeEndDate || (listing.endDateTime ? String(listing.endDateTime).slice(0, 10) : "");
  if (!start) return "Dates not listed";
  const fmt = (value) => {
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };
  return end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

function formatTime(value) {
  if (!value) return "";
  const [h, m] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function HalloweenSpotPopupCard({ listing }) {
  const fullIcon = listing.custom_icon_url || HALLOWEEN_ICON_ASSETS[listing.halloween_icon_key || listing.icon_key || "halloween_decorations"] || HALLOWEEN_ICON_ASSETS.halloween_decorations;
  const startTime = listing.halloween_start_time || listing.viewing_start_time || "";
  const endTime = listing.halloween_end_time || listing.viewing_end_time || "";
  const address = listing.display_address || listing.address_text || listing.addressText || listing.address || [listing.city, listing.state, listing.zip].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-400/60 bg-gradient-to-b from-purple-950 via-slate-950 to-black text-white shadow-[0_10px_30px_rgba(88,28,135,0.45)]">
      <div className="relative px-3 pt-3 pb-2">
        <div className="pointer-events-none absolute right-3 top-2 text-xl opacity-70">🎃</div>
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-orange-300/50 bg-orange-500/10 shadow-[0_0_18px_rgba(249,115,22,0.28)]">
            <img src={fullIcon} alt="" className="h-14 w-14 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-200">Halloween Spot</div>
            <h3 className="mt-1 truncate text-base font-black text-white">{listing.title || "Halloween Spot"}</h3>
            <p className="text-[11px] font-semibold text-purple-200">{(listing.halloween_icon_key || "halloween_decorations").replaceAll("_", " ")}</p>
          </div>
        </div>
      </div>

      {listing.description && <p className="px-3 pb-2 text-[11px] leading-relaxed text-slate-200 line-clamp-3">{listing.description}</p>}

      <div className="mx-3 mb-3 space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-2 text-[10px] text-slate-200">
        <div className="flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" /><span className="break-words">{address || "Address unavailable"}</span></div>
        <div className="flex gap-2"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-300" /><span>{formatDateRange(listing)}</span></div>
        <div className="flex gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" /><span>{startTime || endTime ? `${formatTime(startTime) || "Start time TBD"}${endTime ? ` – ${formatTime(endTime)}` : ""}` : "Hours not listed"}</span></div>
      </div>
    </div>
  );
}
