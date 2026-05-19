import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin } from "lucide-react";
import { getVendorEventVisibilityStatus } from "@/lib/vendorEventPromotion";

/**
 * Popup shown when a stacked vendor event marker is clicked.
 * Shows the primary event details + list of stacked events.
 */
export default function StackedVendorEventsPopup({ primary, stacked = [], onViewAll, onNavigate }) {
  const now = new Date();
  const primaryStatus = getVendorEventVisibilityStatus(primary, now);

  return (
    <div className="space-y-3 min-w-[220px] max-w-[280px]">
      {/* Primary event */}
      <div>
        <div className="flex items-center gap-1 flex-wrap mb-1">
          <Badge className={primaryStatus === "active" ? "bg-emerald-600 text-white text-[9px] px-1 py-0" : "bg-amber-500 text-white text-[9px] px-1 py-0"}>
            {primaryStatus === "active" ? "Active Now" : "Coming Soon"}
          </Badge>
        </div>
        <p className="font-bold text-sm leading-tight">{primary.title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{primary.display_address}</p>
        <p className="text-[11px] text-slate-500">{format(new Date(primary.startDateTime), "MMM d, yyyy h:mm a")}</p>
      </div>

      {/* Stacked events */}
      {stacked.length > 0 && (
        <div className="border-t border-slate-100 pt-2 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Also at this location:</p>
          {stacked.map((evt) => {
            const s = getVendorEventVisibilityStatus(evt, now);
            return (
              <div key={evt.id} className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 truncate">{evt.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {s === "coming_soon" ? "Coming Soon — " : ""}
                    starts {format(new Date(evt.startDateTime), "MMM d")}
                  </p>
                </div>
                <Badge className={s === "active" ? "bg-emerald-600 text-white text-[9px] px-1 py-0 shrink-0" : "bg-amber-400 text-white text-[9px] px-1 py-0 shrink-0"}>
                  {s === "active" ? "Live" : "Soon"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-1.5 pt-1 border-t border-slate-100">
        <Button
          size="sm"
          onClick={onNavigate}
          className="h-6 flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] px-2"
        >
          View Event
        </Button>
        {stacked.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewAll}
            className="h-6 flex-1 text-[11px] px-2"
          >
            View All ({stacked.length + 1})
          </Button>
        )}
      </div>
    </div>
  );
}