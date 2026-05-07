import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin } from "lucide-react";
import { format } from "date-fns";

export default function CheckInHistory({ vendorAccount }) {
  const { data: checkIns = [] } = useQuery({
    queryKey: ["vendorCheckInHistory", vendorAccount?.id],
    queryFn: () => base44.entities.VendorPinCheckIn.filter({ vendor_account_id: vendorAccount.id }, "-created_date"),
    enabled: !!vendorAccount?.id,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-lg">Check-In History</h2>
        <p className="text-sm text-muted-foreground">Recent vendor pin activity.</p>
      </div>
      <div className="space-y-3">
        {checkIns.map((checkIn) => (
          <div key={checkIn.id} className="rounded-2xl border bg-card p-4 flex gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{checkIn.checkin_display_address || "Vendor check-in"}</p>
              <p className="text-xs text-muted-foreground capitalize">{checkIn.status}</p>
              <p className="text-xs text-muted-foreground">{checkIn.checkin_start_time ? format(new Date(checkIn.checkin_start_time), "MMM d, yyyy h:mm a") : "No start time"}</p>
            </div>
          </div>
        ))}
        {checkIns.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No check-in history yet.</p>}
      </div>
    </div>
  );
}