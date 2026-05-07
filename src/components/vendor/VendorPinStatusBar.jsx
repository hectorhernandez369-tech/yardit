import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function VendorPinStatusBar({ pins = [], checkIns = [] }) {
  const now = new Date();
  const liveCheckIns = checkIns
    .filter((item) => item.status === "live" && item.checkin_end_time && new Date(item.checkin_end_time) > now)
    .sort((a, b) => new Date(a.checkin_end_time) - new Date(b.checkin_end_time));

  const activeCheckIn = liveCheckIns[0];
  const activePin = activeCheckIn ? pins.find((pin) => pin.id === activeCheckIn.vendor_pin_id) : null;

  if (!activeCheckIn) {
    return (
      <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-3 w-3 rounded-full bg-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2C4F4E]">Offline</p>
            <p className="text-xs text-muted-foreground truncate">No active pin location right now</p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full">Inactive</Badge>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-600" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-green-800">Live Now</p>
          <p className="text-xs text-green-700 truncate">
            {activePin?.pin_name || "Vendor pin"} is open until {format(new Date(activeCheckIn.checkin_end_time), "h:mm a")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-green-800">
        <MapPin className="h-3.5 w-3.5" />
        <span className="truncate max-w-[240px]">{activeCheckIn.checkin_display_address || "Current location active"}</span>
        <Clock className="h-3.5 w-3.5 ml-1" />
      </div>
    </div>
  );
}