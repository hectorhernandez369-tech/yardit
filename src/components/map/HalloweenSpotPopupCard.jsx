import React from "react";
import { AlertTriangle, Baby, CalendarDays, Candy, Clock3, Footprints, Lightbulb, MapPin, Star, Volume2 } from "lucide-react";
import { HALLOWEEN_ICON_ASSETS, isAshevilleDecorationSpot } from "@/lib/halloweenMapIcons";
import { getHalloweenSpotTypeLabel, getHalloweenCandyBadgeLabel, hasHalloweenCandy } from "@/lib/halloweenSpots";

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
  const defaultIcon = HALLOWEEN_ICON_ASSETS[listing.halloween_spot_type || listing.halloween_icon_key || listing.icon_key || "halloween_decorations"] || HALLOWEEN_ICON_ASSETS.halloween_decorations;
  const fullIcon = isAshevilleDecorationSpot(listing) && listing.custom_icon_url ? listing.custom_icon_url : defaultIcon;
  const startTime = listing.halloween_start_time || listing.viewing_start_time || "";
  const endTime = listing.halloween_end_time || listing.viewing_end_time || "";
  const address = listing.display_address || listing.address_text || listing.addressText || listing.address || [listing.city, listing.state, listing.zip].filter(Boolean).join(", ");
  const candyBadgeLabel = getHalloweenCandyBadgeLabel(listing);
  const hasCandy = hasHalloweenCandy(listing);

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-400/60 bg-gradient-to-b from-purple-950 via-slate-950 to-black text-white shadow-[0_10px_30px_rgba(88,28,135,0.45)]">
      <div className="relative px-2.5 pb-1.5 pt-2 pr-9">
        <div className="pointer-events-none absolute right-9 top-1.5 text-base opacity-70">🎃</div>
        <div className="flex items-center gap-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-300/50 bg-orange-500/10 shadow-[0_0_14px_rgba(249,115,22,0.25)]">
            <img src={fullIcon} alt="" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex rounded-full border border-orange-300/40 bg-orange-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-200">Halloween Spot</div>
            <h3 className="mt-0.5 truncate text-sm font-black text-white">{listing.title || "Halloween Spot"}</h3>
            <p className="text-[10px] font-semibold text-purple-200">{getHalloweenSpotTypeLabel(listing)}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {listing.halloween_featured_badge === "must_see" && <div className="inline-flex items-center gap-1 rounded-full border border-yellow-300/50 bg-yellow-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-200"><Star className="h-3 w-3" /> Yardit Must See</div>}
              {hasCandy && <div className="inline-flex items-center gap-1 rounded-full border border-pink-300/60 bg-pink-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-pink-100"><Candy className="h-3 w-3" /> {candyBadgeLabel}</div>}
            </div>
          </div>
        </div>
      </div>

      {listing.description && <p className="px-2.5 pb-1.5 text-[10px] leading-relaxed text-slate-200 line-clamp-2">{listing.description}</p>}

      <div className="mx-2.5 mb-1.5 space-y-1 rounded-lg border border-white/10 bg-white/5 p-1.5 text-[9px] text-slate-200">
        <div className="flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" /><span className="break-words">{address || "Address unavailable"}</span></div>
        <div className="flex gap-2"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-300" /><span>{formatDateRange(listing)}</span></div>
        <div className="flex gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" /><span>{startTime || endTime ? `${formatTime(startTime) || "Start time TBD"}${endTime ? ` – ${formatTime(endTime)}` : ""}` : "Hours not listed"}</span></div>
      </div>

      <div className="mx-2.5 mb-2 flex flex-wrap gap-1">
        {(listing.halloween_tags || []).includes("kid_friendly") && <span className="inline-flex items-center gap-1 rounded-full border border-purple-300/30 bg-purple-500/15 px-2 py-1 text-[9px] font-bold text-purple-100"><Baby className="h-3 w-3" /> Kid Friendly</span>}
        {(listing.halloween_tags || []).includes("no_candy_here") && <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/30 bg-orange-500/15 px-2 py-1 text-[9px] font-bold text-orange-100"><Candy className="h-3 w-3" /> No Candy Here</span>}
        {hasCandy && <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/30 bg-orange-500/15 px-2 py-1 text-[9px] font-bold text-orange-100"><Candy className="h-3 w-3" /> {candyBadgeLabel}</span>}
        {listing.halloween_walkthrough && <span className="inline-flex items-center gap-1 rounded-full border border-purple-300/30 bg-purple-500/15 px-2 py-1 text-[9px] font-bold text-purple-100"><Footprints className="h-3 w-3" /> Walk-through</span>}
        {listing.halloween_lights && <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300/30 bg-yellow-500/15 px-2 py-1 text-[9px] font-bold text-yellow-100"><Lightbulb className="h-3 w-3" /> Lights</span>}
        {listing.halloween_sound && <span className="inline-flex items-center gap-1 rounded-full border border-purple-300/30 bg-purple-500/15 px-2 py-1 text-[9px] font-bold text-purple-100"><Volume2 className="h-3 w-3" /> Sound / Music</span>}
        {listing.halloween_jump_scares && <span className="inline-flex items-center gap-1 rounded-full border border-red-300/30 bg-red-500/15 px-2 py-1 text-[9px] font-bold text-red-100"><AlertTriangle className="h-3 w-3" /> Jump Scares</span>}
        {listing.halloween_suggested_age && <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[9px] font-bold text-slate-100">Age: {listing.halloween_suggested_age}</span>}
      </div>
    </div>
  );
}