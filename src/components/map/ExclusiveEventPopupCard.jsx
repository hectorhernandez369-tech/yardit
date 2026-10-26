import React from "react";
import { useNavigate } from "react-router-dom";
import { Crown, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";
import "@/components/map/exclusiveEventPopup.css";

export default function ExclusiveEventPopupCard({ event }) {
  const navigate = useNavigate();
  const status = getVendorEventVisibilityStatus(event, new Date());
  const start = event.startDateTime || event.start_date_time || event.start_date;
  const address = event.display_address || event.address;
  const dateLabel = start ? new Date(start).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    ...(event.timeZoneId ? { timeZone: event.timeZoneId } : {}),
  }) : "";
  return (
    <div className="yardit-exclusive-event-card space-y-3 rounded-xl border-2 border-accent bg-foreground p-4 text-background">
      <div className="flex items-center gap-2 border-b border-accent/30 pb-2 text-accent">
        <Crown className="h-4 w-4 shrink-0" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest">Yardit's Own · Exclusive</span>
      </div>
      <span className="inline-block rounded border border-accent/50 bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
        {status === "coming_soon" ? "Coming Soon" : status === "active" ? "Active Now" : "Scheduled"}
      </span>
      <h3 className="text-base font-extrabold leading-tight">{event.title || event.name || "Featured event"}</h3>
      {address && <div className="flex items-start gap-2 text-xs text-background/80"><MapPin className="h-3.5 w-3.5 shrink-0" /><span>{address}</span></div>}
      {dateLabel && <div className="flex items-start gap-2 text-xs text-background/80"><CalendarDays className="h-3.5 w-3.5 shrink-0" /><span>{dateLabel}</span></div>}
      <div className="border-t border-accent/30 pt-3">
        <Button size="sm" onClick={() => navigate(`/VendorEventPublicPage?id=${encodeURIComponent(event.id)}`)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">View Event</Button>
      </div>
    </div>
  );
}