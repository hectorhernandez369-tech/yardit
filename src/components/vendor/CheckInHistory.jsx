import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, User, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function CheckInHistory({ vendorAccount }) {
  const { data: checkIns = [] } = useQuery({
    queryKey: ["vendorCheckInHistory", vendorAccount?.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: vendorAccount.id }, "-created_date"),
    enabled: !!vendorAccount?.id,
  });

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorPinsForHistory", vendorAccount?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: vendorAccount.id }),
    enabled: !!vendorAccount?.id,
  });

  const pinById = Object.fromEntries(pins.map((p) => [p.id, p]));

  const statusColor = {
    live: "bg-green-100 text-green-800",
    paused: "bg-amber-100 text-amber-800",
    ended: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-lg">Check-In History</h2>
        <p className="text-sm text-muted-foreground">Recent vendor pin activity.</p>
      </div>
      <div className="space-y-3">
        {checkIns.map((checkIn) => {
          const pin = pinById[checkIn.vendor_pin_id];
          const startTime = checkIn.checkin_start_time ? new Date(checkIn.checkin_start_time) : null;
          const endTime = checkIn.checkin_end_time ? new Date(checkIn.checkin_end_time) : null;
          return (
            <div key={checkIn.id} className="rounded-2xl border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 text-[#5DADA5] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{checkIn.checkin_display_address || checkIn.checkin_geocoded_address || "Location not recorded"}</p>
                    {pin && <p className="text-xs text-muted-foreground">{pin.pin_name}</p>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor[checkIn.status] || "bg-slate-100 text-slate-600"}`}>
                  {checkIn.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-muted-foreground pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{startTime ? format(startTime, "MMM d, yyyy") : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {startTime ? format(startTime, "h:mm a") : "—"}
                    {" – "}
                    {endTime ? format(endTime, "h:mm a") : "—"}
                  </span>
                </div>
                {checkIn.checked_in_by_email && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{checkIn.checked_in_by_email}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {checkIns.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No check-in history yet.</p>}
      </div>
    </div>
  );
}