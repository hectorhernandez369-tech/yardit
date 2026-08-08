import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, CalendarDays, Flag, MapPin, Pencil, Users, Clock, ExternalLink, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatVendorEventType, getVendorEventStatus } from "@/lib/vendorEvents";

const STATUS_CONFIG = {
  active:          { label: "Active",        dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  coming_soon:     { label: "Coming Soon",   dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  scheduled:       { label: "Upcoming",      dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  upcoming:        { label: "Upcoming",      dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  draft:           { label: "Draft",         dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200" },
  completed:       { label: "Completed",     dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-500 border-slate-200" },
  cancelled:       { label: "Cancelled",     dot: "bg-red-400",     badge: "bg-red-50 text-red-600 border-red-200" },
  pending_payment: { label: "Pending Payment", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function VendorEventCard({ event, distanceMiles, approvedVendorCount = 0, hostedLabels, isCollaborating = false, ownerName = "", canEdit = false, canManageVendors = false, canManageFlags = false, canManageSchedule = false, canManageCollaborators = false, onView, onEdit, onManage, onEditFlags, onSchedule, onCollaborators }) {
  const status = getVendorEventStatus(event);
  const cfg = STATUS_CONFIG[status] || { label: status, dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200" };

  return (
    <Card className="rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
      {/* Status bar accent */}
      <div className={`h-1 w-full ${status === "active" ? "bg-emerald-500" : status === "draft" ? "bg-slate-300" : status === "coming_soon" ? "bg-amber-400" : "bg-[#5DADA5]"}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: main info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              {isCollaborating && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200">Collaborating</span>}
              {event.promotion_upgrade_required && <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">⚠ Upgrade Required</span>}
            </div>

            <h3 className="text-lg font-bold text-slate-900 leading-snug">{event.title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{formatVendorEventType(event.event_type)}{event.category ? ` · ${event.category}` : ""}</p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{event.display_address || "Address not set"}{distanceMiles != null ? <span className="text-slate-400 ml-1">· {distanceMiles.toFixed(1)} mi</span> : null}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{format(new Date(event.startDateTime), "MMM d, yyyy · h:mm a")} → {format(new Date(event.endDateTime), "MMM d, yyyy · h:mm a")}</span>
              </div>
              {event.open_to_vendors && event.max_vendors && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{approvedVendorCount} / {event.max_vendors} vendors approved</span>
                </div>
              )}
              {isCollaborating && ownerName && <p className="text-xs text-purple-600 font-medium pl-6">Organized by {ownerName}</p>}
              {hostedLabels?.coHostedBy?.length > 0 && <p className="text-xs text-slate-500 pl-6">Co-hosted by {hostedLabels.coHostedBy.join(", ")}</p>}
              {status === "coming_soon" && event.coming_soon_start_date && (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 pl-6">
                  <Clock className="h-3 w-3" />Coming Soon from {format(new Date(event.coming_soon_start_date), "MMM d, yyyy")}
                </div>
              )}
            </div>
          </div>

          {/* Right: quick view button */}
          <Button variant="ghost" size="icon" onClick={onView} className="shrink-0 text-slate-400 hover:text-[#5DADA5]" title="View public page">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {/* Action row */}
        {(canEdit || canManageVendors || canManageFlags || canManageSchedule || canManageCollaborators) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            {canEdit && (
              <Button size="sm" variant="outline" onClick={onEdit} className="h-8 gap-1.5 text-xs border-slate-200">
                <Pencil className="h-3.5 w-3.5" /> Edit Details
              </Button>
            )}
            {canManageFlags && ["multi_spot", "multi_location"].includes(event.event_type) && (
              <Button size="sm" variant="outline" onClick={onEditFlags} className="h-8 gap-1.5 text-xs border-slate-200">
                <Flag className="h-3.5 w-3.5" /> Flags
              </Button>
            )}
            {canManageSchedule && (
              <Button size="sm" variant="outline" onClick={onSchedule} className="h-8 gap-1.5 text-xs border-slate-200">
                <CalendarClock className="h-3.5 w-3.5" /> Schedule
              </Button>
            )}
            {canManageCollaborators && (
              <Button size="sm" variant="outline" onClick={onCollaborators} className="h-8 gap-1.5 text-xs border-slate-200">
                <Users className="h-3.5 w-3.5" /> Collaborators
              </Button>
            )}
            {canManageVendors && (
              <Button size="sm" onClick={onManage} className="h-8 gap-1.5 text-xs bg-[#2C4F4E] text-white hover:bg-[#3d6b6a] ml-auto">
                <Users className="h-3.5 w-3.5" /> Manage Vendors <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}