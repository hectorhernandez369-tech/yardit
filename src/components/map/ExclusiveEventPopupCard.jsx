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
    <div className="yardit-exclusive-event-card space-y-3 rounded-xl">
      <div className="yardit-exclusive-eyebrow flex items-center gap-2 pb-2">
        <Crown className="h-4 w-4 shrink-0" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest">Yardit's Own · Exclusive</span>
      </div>
      <span className="yardit-exclusive-status inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
        {status === "coming_soon" ? "Coming Soon" : status === "active" ? "Active Now" : "Scheduled"}
      </span>
      <h3 className="yardit-exclusive-title font-bold">{event.title || event.name || "Featured event"}</h3>
      {address && <div className="yardit-exclusive-meta flex items-start gap-2 text-xs"><MapPin className="h-3.5 w-3.5 shrink-0" /><span>{address}</span></div>}
      {dateLabel && <div className="yardit-exclusive-meta flex items-start gap-2 text-xs"><CalendarDays className="h-3.5 w-3.5 shrink-0" /><span>{dateLabel}</span></div>}
      <div className="yardit-exclusive-footer pt-3">
        <Button size="sm" onClick={() => navigate(`/VendorEventPublicPage?id=${encodeURIComponent(event.id)}`)} className="yardit-exclusive-button w-full">View Event</Button>
      </div>
    </div>
  );
}