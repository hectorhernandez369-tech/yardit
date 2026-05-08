import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPlus, Search, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VendorEventCard from "./VendorEventCard";
import VendorEventForm from "./VendorEventForm";
import { calculateMiles, getVendorEventStatus } from "@/lib/vendorEvents";

export default function VendorEventsTab({ account, user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [tab, setTab] = useState("active");
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [distance, setDistance] = useState("100");
  const [eventType, setEventType] = useState("all");
  const [showOpenToVendors, setShowOpenToVendors] = useState(true);
  const [sort, setSort] = useState("soonest");
  const [userLocation, setUserLocation] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["vendorEvents"],
    queryFn: () => base44.entities.VendorEvent.list("startDateTime"),
    initialData: [],
  });

  const { data: attendees = [] } = useQuery({
    queryKey: ["eventVendorAttendeesAll"],
    queryFn: () => base44.entities.EventVendorAttendee.list(),
    initialData: [],
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    });
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    });
  };

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .map((event) => ({
        ...event,
        distanceMiles: userLocation ? calculateMiles(userLocation.lat, userLocation.lng, event.latitude, event.longitude) : null,
        computedStatus: getVendorEventStatus(event, now),
        approvedVendorCount: attendees.filter((attendee) => attendee.event_id === event.id).length,
      }))
      .filter((event) => event.organizer_business_id === account.id || ["published", "active"].includes(event.status))
      .filter((event) => tab === "history" ? ["completed", "cancelled"].includes(event.computedStatus) : !["completed", "cancelled"].includes(event.computedStatus))
      .filter((event) => !query || `${event.title} ${event.description} ${event.category}`.toLowerCase().includes(query.toLowerCase()))
      .filter((event) => !locationQuery || (event.display_address || "").toLowerCase().includes(locationQuery.toLowerCase()))
      .filter((event) => eventType === "all" || event.event_type === eventType)
      .filter((event) => showOpenToVendors ? event.open_to_vendors || event.organizer_business_id === account.id : true)
      .filter((event) => !userLocation || distance === "any" || event.distanceMiles === null || event.distanceMiles <= Number(distance))
      .sort((a, b) => {
        if (sort === "latest") return new Date(b.startDateTime) - new Date(a.startDateTime);
        if (sort === "closest") return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
        return new Date(a.startDateTime) - new Date(b.startDateTime);
      });
  }, [events, attendees, account.id, tab, query, locationQuery, distance, eventType, showOpenToVendors, sort, userLocation]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm border border-[#2C4F4E]/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[#2C4F4E]">Vendor Events</h2>
            <p className="text-sm text-slate-600">Create, search, manage, and join vendor-only events.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"><CalendarPlus className="h-4 w-4" /> Create Event</Button>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_180px_auto]">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search events" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-white"><input type="checkbox" checked={showOpenToVendors} onChange={(e) => setShowOpenToVendors(e.target.checked)} />Open to Vendors Only</label>
          <Select value={sort} onValueChange={setSort}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="soonest">Soonest</SelectItem><SelectItem value="latest">Latest</SelectItem><SelectItem value="closest">Closest</SelectItem></SelectContent></Select>
          <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal className="h-4 w-4" /> Filters</Button>
        </div>

        {filtersOpen && (
          <div className="grid gap-2 md:grid-cols-[1fr_140px_180px_auto] rounded-2xl bg-[#FBFAF7] p-3">
            <Input placeholder="Location override" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} />
            <Select value={distance} onValueChange={setDistance}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="100">100 miles</SelectItem><SelectItem value="25">25 miles</SelectItem><SelectItem value="50">50 miles</SelectItem><SelectItem value="any">Any distance</SelectItem></SelectContent></Select>
            <Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="single">Single</SelectItem><SelectItem value="multi_spot">Multi-Spot</SelectItem><SelectItem value="multi_location">Multi-Location</SelectItem></SelectContent></Select>
            <Button variant="outline" size="sm" onClick={useMyLocation}>Use my location</Button>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="active">Active Events</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
        <TabsContent value={tab} className="space-y-3">
          {filteredEvents.length ? filteredEvents.map((event) => (
            <VendorEventCard
              key={event.id}
              event={event}
              distanceMiles={event.distanceMiles}
              approvedVendorCount={event.approvedVendorCount}
              canManage={event.organizer_business_id === account.id}
              onEdit={() => setEditingEvent(event)}
              onManage={() => navigate(`/VendorEventDashboard?id=${event.id}`)}
              onView={() => navigate(`/VendorEventPublicPage?id=${event.id}`)}
            />
          )) : (
            <Card><CardContent className="p-8 text-center text-slate-500">No vendor events found.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Vendor Event</DialogTitle></DialogHeader>
          <VendorEventForm account={account} user={user} onCreated={() => { queryClient.invalidateQueries({ queryKey: ["vendorEvents"] }); setShowCreate(false); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Details — Public Page Details</DialogTitle></DialogHeader>
          {editingEvent && (
            <VendorEventForm
              account={account}
              user={user}
              event={editingEvent}
              approvedVendorCount={editingEvent.approvedVendorCount}
              mode="public"
              onCreated={() => {
                queryClient.invalidateQueries({ queryKey: ["vendorEvents"] });
                setEditingEvent(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}