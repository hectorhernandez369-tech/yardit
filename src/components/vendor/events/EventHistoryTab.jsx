import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { getVendorEventStatus } from "@/lib/vendorEvents";

export default function EventHistoryTab({ events, attendees, account, navigate, onRepeatHost }) {
  const now = new Date();
  const organizationIds = account?.id ? [account.id] : [];

  const historyEvents = events
    .map((e) => ({
      ...e,
      computedStatus: getVendorEventStatus(e, now),
      attendeeCount: attendees.filter((a) => a.event_id === e.id).length,
    }))
    .filter((e) => ["completed", "cancelled"].includes(e.computedStatus))
    .filter((e) => e.organizer_business_id === account?.id)
    .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

  const completed = historyEvents.filter((e) => e.computedStatus === "completed");
  const cancelled = historyEvents.filter((e) => e.computedStatus === "cancelled");

  if (historyEvents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 flex flex-col items-center text-center gap-3">
        <CalendarDays className="h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-600">No event history yet</p>
        <p className="text-sm text-slate-400">Completed and cancelled events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Events" value={historyEvents.length} color="slate" />
        <StatCard label="Completed" value={completed.length} color="green" />
        <StatCard label="Cancelled" value={cancelled.length} color="red" />
      </div>

      {completed.length > 0 && (
        <div>
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Completed Events</h4>
          <div className="space-y-3">
            {completed.map((event) => <HistoryCard key={event.id} event={event} navigate={navigate} onRepeatHost={onRepeatHost} />)}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div>
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Cancelled Events</h4>
          <div className="space-y-2">
            {cancelled.map((event) => <HistoryCard key={event.id} event={event} navigate={navigate} onRepeatHost={onRepeatHost} isCancelled />)}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = { slate: "bg-slate-100 text-slate-600", green: "bg-green-100 text-green-700", red: "bg-red-100 text-red-600" };
  return (
    <div className={`rounded-xl p-4 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}

function HistoryCard({ event, navigate, onRepeatHost, isCancelled }) {
  const startDate = event.startDateTime ? format(new Date(event.startDateTime), "MMM d, yyyy") : null;

  return (
    <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold text-sm ${isCancelled ? "text-slate-400 line-through" : "text-slate-800"}`}>{event.title}</h4>
              <Badge className={isCancelled ? "bg-red-100 text-red-600 text-[10px]" : "bg-green-100 text-green-700 text-[10px]"}>
                {isCancelled ? "Cancelled" : "Completed"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
              {startDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{startDate}</span>}
              {event.display_address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.display_address}</span>}
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.attendeeCount} vendor{event.attendeeCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => navigate(`/VendorEventPublicPage?id=${event.id}`)} className="text-xs">View</Button>
            {!isCancelled && (
              <Button size="sm" variant="outline" onClick={() => onRepeatHost(event)} className="text-xs gap-1">
                <RotateCcw className="h-3 w-3" /> Repeat
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}