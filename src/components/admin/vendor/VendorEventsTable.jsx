import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, ExternalLink, Users } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const EVENT_TYPE_LABELS = {
  single: "Single",
  multi_spot: "Multi-Spot",
  multi_location: "Multi-Location",
};

const EVENT_TYPE_COLORS = {
  single: "bg-blue-100 text-blue-800",
  multi_spot: "bg-purple-100 text-purple-800",
  multi_location: "bg-amber-100 text-amber-800",
};

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  pending_payment: "bg-amber-100 text-amber-800",
  published: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

export default function VendorEventsTable({ user }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["vendorEventsAdmin"],
    queryFn: () => base44.entities.VendorEvent.list("-created_date"),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["vendorEventRequestsAdmin"],
    queryFn: () => base44.entities.EventVendorRequest.list(),
  });

  const pendingRequestsByEvent = {};
  requests.filter(r => r.status === "pending").forEach(r => {
    pendingRequestsByEvent[r.event_id] = (pendingRequestsByEvent[r.event_id] || 0) + 1;
  });

  const filtered = events.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.title || "").toLowerCase().includes(q) ||
      (e.organizer_business_name || "").toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q)
    );
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading vendor events...</div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by title, organizer, or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-lg border">No vendor events found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 50).map(event => {
            const pending = pendingRequestsByEvent[event.id] || 0;
            const startDt = event.startDateTime ? new Date(event.startDateTime) : null;
            const endDt = event.endDateTime ? new Date(event.endDateTime) : null;
            return (
              <Card key={event.id} className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[#5DADA5] shrink-0" />
                        <span className="font-semibold text-[#2C4F4E] truncate">{event.title || "Untitled Event"}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={EVENT_TYPE_COLORS[event.event_type] || "bg-slate-100 text-slate-700"}>
                          {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                        </Badge>
                        <Badge className={STATUS_COLORS[event.status] || "bg-slate-100 text-slate-700"}>
                          {event.status || "unknown"}
                        </Badge>
                        {event.open_to_vendors && (
                          <Badge className="bg-teal-100 text-teal-800">Open to Vendors</Badge>
                        )}
                        {pending > 0 && (
                          <Badge className="bg-orange-100 text-orange-800">
                            <Users className="w-3 h-3 mr-1 inline" />{pending} pending request{pending !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <p>Organizer: <span className="text-slate-700">{event.organizer_business_name || "Unknown"}</span></p>
                        {startDt && endDt && (
                          <p>
                            {format(startDt, "MMM d, yyyy h:mm a")} → {format(endDt, "MMM d, yyyy h:mm a")}
                          </p>
                        )}
                        {event.display_address && <p>{event.display_address}</p>}
                        {event.category && <p>Category: {event.category}</p>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => navigate("/VendorEventDetail?eventId=" + event.id)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length > 50 && (
            <p className="text-xs text-slate-400 text-center pt-2">Showing first 50 of {filtered.length} results. Use search to narrow.</p>
          )}
        </div>
      )}
    </div>
  );
}