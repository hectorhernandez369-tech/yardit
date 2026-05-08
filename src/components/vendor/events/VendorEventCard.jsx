import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, MapPin, Pencil, Users } from "lucide-react";
import { format } from "date-fns";
import { formatVendorEventType, getVendorEventStatus } from "@/lib/vendorEvents";

export default function VendorEventCard({ event, distanceMiles, approvedVendorCount = 0, canManage = false, onView, onEdit, onManage }) {
  const status = getVendorEventStatus(event);

  return (
    <Card className="rounded-2xl border-[#2C4F4E]/15 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-[#2C4F4E] leading-tight">{event.title}</h3>
            <p className="text-sm text-slate-600">{formatVendorEventType(event.event_type)}</p>
          </div>
          <Badge className="capitalize bg-[#5DADA5] text-white">{status}</Badge>
        </div>

        <div className="space-y-1.5 text-sm text-slate-600">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#F4A849]" />{event.display_address || "Address not set"}</div>
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#F4A849]" />{format(new Date(event.startDateTime), "MMM d, yyyy h:mm a")} - {format(new Date(event.endDateTime), "MMM d, yyyy h:mm a")}</div>
          {distanceMiles !== null && distanceMiles !== undefined && <p className="text-xs font-semibold text-slate-500">{distanceMiles.toFixed(1)} miles away</p>}
          {event.open_to_vendors && event.max_vendors && <p className="text-xs font-semibold text-emerald-700">Approved vendors: {approvedVendorCount} / {event.max_vendors}</p>}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-2">
            {event.open_to_vendors && <Badge className="bg-emerald-600 text-white">Open to vendors</Badge>}
            <Badge variant="outline" className="capitalize">{event.category || "Event"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button variant="outline" onClick={onEdit}><Pencil className="h-4 w-4" /> Edit Details</Button>
                <Button variant="outline" onClick={onManage}><Users className="h-4 w-4" /> Vendor Management</Button>
              </>
            )}
            <Button onClick={onView} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">View Details</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}