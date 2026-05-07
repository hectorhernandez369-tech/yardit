import { format } from "date-fns";
import { Clock, MapPin, Truck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function VendorPinHistoryTab({ pins = [], checkIns = [] }) {
  const pinById = new Map(pins.map((pin) => [pin.id, pin]));

  if (!checkIns.length) {
    return (
      <Card className="rounded-3xl border-dashed bg-white">
        <CardContent className="p-8 text-center space-y-3">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold text-[#2C4F4E]">No check-in history yet</h2>
          <p className="text-sm text-muted-foreground">Once a truck drops a pin, its date, time, location, and user will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div>
        <h2 className="text-lg font-bold text-[#2C4F4E]">Pin Check-In History</h2>
        <p className="text-sm text-muted-foreground">A complete record of where each truck pin checked in.</p>
      </div>

      <div className="space-y-3">
        {checkIns.map((checkIn) => {
          const pin = pinById.get(checkIn.vendor_pin_id);
          const startTime = checkIn.checkin_start_time || checkIn.created_date;
          const endTime = checkIn.checkin_end_time;
          const location = checkIn.checkin_display_address || `${checkIn.checkin_latitude}, ${checkIn.checkin_longitude}`;

          return (
            <Card key={checkIn.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4">
                <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Truck className="h-4 w-4 text-[#5DADA5]" />
                      <h3 className="font-semibold text-[#2C4F4E] break-words">{pin?.pin_name || "Unknown pin"}</h3>
                      <Badge variant="outline" className="capitalize">{checkIn.status || "history"}</Badge>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="min-w-0 break-all">{checkIn.checked_in_by_email || "Unknown user"}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#F3E6CF]/70 px-4 py-3 text-sm text-[#2C4F4E] md:text-right">
                    <p className="font-semibold">{startTime ? format(new Date(startTime), "MMM d, yyyy") : "Date unavailable"}</p>
                    <p>{startTime ? format(new Date(startTime), "h:mm a") : "Time unavailable"}{endTime ? ` - ${format(new Date(endTime), "h:mm a")}` : ""}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}