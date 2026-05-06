import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";

export default function VendorCheckInHistory({ checkIns, pins }) {
  const pinName = (id) => pins.find((pin) => pin.id === id)?.pin_name || "Vendor Pin";

  return (
    <div className="grid gap-3">
      {checkIns.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[#2C4F4E]">{pinName(item.vendor_pin_id)}</p>
              <p className="text-sm text-slate-600">{item.checkin_display_address || `${item.checkin_latitude}, ${item.checkin_longitude}`}</p>
              <p className="text-xs text-slate-500">{format(new Date(item.checkin_start_time), "MMM d, h:mm a")} - {format(new Date(item.checkin_end_time), "h:mm a")}</p>
            </div>
            <Badge className={isLiveVendorCheckIn(item) ? "bg-green-600" : "bg-slate-500"}>{isLiveVendorCheckIn(item) ? "Live" : "Expired"}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}