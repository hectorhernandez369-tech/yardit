import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";

export default function VendorActivePinPreview({ pins, checkIns }) {
  const liveItems = (checkIns || []).filter(isLiveVendorCheckIn);
  const pinName = (id) => pins.find((pin) => pin.id === id)?.pin_name || "Vendor Pin";

  return (
    <Card className="border-[#2C4F4E]/15">
      <CardHeader>
        <CardTitle className="text-[#2C4F4E]">Active Locations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {liveItems.length === 0 ? (
          <div className="rounded-2xl bg-[#F3E6CF]/70 p-5 text-sm text-slate-600">
            No live locations right now. Check in a pin to appear on the map.
          </div>
        ) : liveItems.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-[#2C4F4E] flex items-center gap-2"><MapPin className="h-4 w-4 text-[#5DADA5]" />{pinName(item.vendor_pin_id)}</p>
              <p className="text-sm text-slate-600">{item.checkin_display_address || `${item.checkin_latitude}, ${item.checkin_longitude}`}</p>
              <p className="text-xs text-slate-500">Ends {format(new Date(item.checkin_end_time), "MMM d, h:mm a")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">Live</Badge>
              <Button variant="outline" onClick={() => { window.location.href = "/"; }}>View on Map</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}