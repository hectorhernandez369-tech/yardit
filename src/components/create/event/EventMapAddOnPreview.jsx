import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { getEventIconEmoji } from "@/lib/eventListingConfig";

export default function EventMapAddOnPreview({ kind, data = {} }) {
  const [effect, setEffect] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();
  const animation = effect || data.event_animation || "pulse";
  const title = data.event_name || data.title || "Community Festival";
  const animate = reduced || kind !== "animation" ? {} : animation === "bounce" ? { y: [0, -7, 0] } : { scale: [1, 1.16, 1] };
  return (
    <div className="space-y-3">
      <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-xl border bg-muted p-5">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full text-background" viewBox="0 0 320 150" preserveAspectRatio="none"><path d="M0 32H320M0 110H320M65 0V150M240 0V150M0 150L320 0" stroke="currentColor" strokeWidth="12" fill="none" /></svg>
        {kind === "premium_visibility" && <div className="relative flex w-full items-center justify-around gap-3 text-center text-xs"><div className="space-y-2 text-muted-foreground"><MapPin className="mx-auto h-6 w-6" />Standard pin</div><div className="space-y-2"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-background shadow-lg"><Sparkles className="h-7 w-7 text-primary" /></div><span className="rounded bg-background px-2 py-1 font-semibold">Prominent event</span></div></div>}
        {kind === "marquee" ? <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="relative w-full max-w-60 rounded-xl border-4 border-dotted border-accent bg-primary p-3 text-primary-foreground shadow-lg"><Sparkles className="mx-auto mb-1 h-5 w-5 motion-safe:animate-pulse" /><span className="block break-words text-sm font-bold">{title}</span>{expanded && <span className="mt-2 block border-t border-primary-foreground/30 pt-2 text-xs">{data.marquee_schedule_slots?.[0]?.label || "Example: Music & activities"}</span>}<span className="mt-2 block text-[10px]">Tap to {expanded ? "collapse" : "expand"} preview</span></button> : kind === "coming_soon" ? <div className="relative rounded-xl border bg-background p-3 text-center shadow-sm"><CalendarDays className="mx-auto mb-2 h-6 w-6 text-primary" /><p className="text-xs font-bold">Coming Soon</p><p className="text-sm">{data.coming_soon_package || "3"} days before event day</p></div> : kind !== "premium_visibility" && <motion.div animate={animate} transition={{ duration: animation === "bounce" ? 1.1 : 1.4, repeat: Infinity, ease: "easeInOut" }} className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-primary bg-background shadow-md">{data.event_logo_url ? <img src={data.event_logo_url} alt="Your event logo preview" className="h-full w-full object-cover" /> : data.event_icon ? <span className="text-3xl">{getEventIconEmoji(data.event_icon)}</span> : <MapPin className="h-7 w-7 text-primary" />}</motion.div>}
      </div>
      {kind === "animation" && <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Try preview:</span>{["pulse", "bounce"].map((value) => <button key={value} type="button" aria-pressed={animation === value} onClick={() => setEffect(value)} className={`rounded-md border px-3 py-1.5 text-xs capitalize ${animation === value ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>{value}</button>)}</div>}
      {kind === "coming_soon" && <div className="flex items-center gap-2 text-[11px]"><span className="rounded bg-secondary px-2 py-1">Coming Soon</span><span className="h-px flex-1 bg-border" /><span className="rounded bg-primary px-2 py-1 text-primary-foreground">Event day</span></div>}
    </div>
  );
}