import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Edit, MapPin, Pause, Square } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isLiveVendorCheckIn } from "@/lib/vendorTiers";
import { toast } from "sonner";

export default function VendorActivePinPreview({ pins, checkIns }) {
  const liveItems = (checkIns || []).filter(isLiveVendorCheckIn);
  const pinName = (id) => pins.find((pin) => pin.id === id)?.pin_name || "Vendor Pin";
  const pinAccountId = (id) => pins.find((pin) => pin.id === id)?.vendor_account_id || "";

  const updateCheckInStatus = async (item, status) => {
    await base44.entities.VendorPinCheckIn.update(item.id, { status });
    await base44.functions.invoke("syncPublicMapRecord", { recordType: "vendor_pin_checkin", recordId: item.id });
    toast.success(status === "paused" ? "Pin paused" : "Pin ended");
    window.location.reload();
  };

  const editPin = (item) => {
    window.location.href = `/VendorPinPreview?pinId=${item.vendor_pin_id}&accountId=${pinAccountId(item.vendor_pin_id)}&checkInId=${item.id}`;
  };

  return (
    <Card className="rounded-2xl sm:rounded-3xl border-slate-200 bg-white shadow-sm overflow-hidden">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-base text-[#2C4F4E]">Live Locations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 p-3 pt-0 sm:p-4 sm:pt-0">
        {liveItems.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-[#F3E6CF]/70 p-3 sm:p-4 text-xs sm:text-sm text-slate-600">
            No live locations right now.
          </div>
        ) : liveItems.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-white p-3 flex min-w-0 flex-col justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-[#2C4F4E] flex items-center gap-2 break-words"><MapPin className="h-4 w-4 shrink-0 text-[#5DADA5]" />{pinName(item.vendor_pin_id)}</p>
              <p className="text-sm text-slate-600 break-words">{item.checkin_display_address || `${item.checkin_latitude}, ${item.checkin_longitude}`}</p>
              <p className="text-xs text-slate-500">Ends {format(new Date(item.checkin_end_time), "MMM d, h:mm a")}</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Badge className="bg-green-600">Live</Badge>
              <Button size="sm" variant="outline" onClick={() => updateCheckInStatus(item, "paused")} className="gap-1">
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateCheckInStatus(item, "ended")} className="gap-1 text-red-600 hover:text-red-700">
                <Square className="h-3.5 w-3.5" /> End
              </Button>
              <Button size="sm" variant="outline" onClick={() => editPin(item)} className="gap-1">
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => { window.location.href = "/"; }}>View on Map</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}