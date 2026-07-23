import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, CalendarDays, Users, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const EVENT_TYPE_LABELS = {
  single: "Single Location",
  multi_spot: "Multi-Spot",
  multi_location: "Multi-Location",
};

export default function EventsHubTab({ events, attendees, vendorAccounts, collaborators, account, onRequestJoin }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [sort, setSort] = useState("soonest");
  const [distance, setDistance] = useState("100");
  const [eventType, setEventType] = useState("all");
  const [filterOpenToVendors, setFilterOpenToVendors] = useState(true);
  const [filterAvailableVendorSpots, setFilterAvailableVendorSpots] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  const calcMiles = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lat2) return null;
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const now = new Date();

  const discoveryEvents = events
    .filter((event) => !["completed", "cancelled"].includes(event.status) && ["published", "active"].includes(event.status))
    .filter((event) => {
      const eventEnd = event.endDateTime || event.startDateTime;
      if (!eventEnd) return true;
      const endDate = new Date(eventEnd);
      return !Number.isNaN(endDate.getTime()) && endDate >= now;
    })
    .map((event) => ({
      ...event,
      distanceMiles: userLocation ? calcMiles(userLocation.lat, userLocation.lng, event.latitude, event.longitude) : null,
      attendeeCount: attendees.filter((attendee) => attendee.event_id === event.id).length,
      organizer: vendorAccounts.find((vendorAccount) => vendorAccount.id === event.organizer_business_id),
    }))
    .filter((event) => {
      const text = `${event.title} ${event.organizer?.business_name || event.organizer_business_name} ${event.display_address} ${event.category}`.toLowerCase();
      if (query && !text.includes(query.toLowerCase())) return false;
      if (locationQuery && !event.display_address?.toLowerCase().includes(locationQuery.toLowerCase())) return false;
      if (eventType !== "all" && event.event_type !== eventType) return false;
      if (filterOpenToVendors && !event.open_to_vendors) return false;
      if (filterAvailableVendorSpots) {
        const capacity = Number(event.max_vendors || 0) || event.vendor_space_options?.reduce((sum, option) => sum + Number(option.quantity || 0), 0) || 0;
        if (capacity > 0 && event.attendeeCount >= capacity) return false;
      }
      if (userLocation && distance !== "any" && event.distanceMiles !== null && event.distanceMiles > Number(distance)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "soonest") return new Date(a.startDateTime) - new Date(b.startDateTime);
      if (sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sort === "nearest") return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
      return 0;
    });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#2C4F4E] to-[#5DADA5] p-5 text-white">
        <h3 className="text-lg font-bold mb-1">Find Events Near You</h3>
        <p className="text-sm text-white/70 mb-4">Discover vendor markets, fairs, and events you can join.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" /><Input className="pl-9 bg-white/15 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20" placeholder="Event name, organizer, category..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="relative flex-1"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" /><Input className="pl-9 bg-white/15 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20" placeholder="City or location..." value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} /></div>
          <Button onClick={useMyLocation} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20"><MapPin className="h-4 w-4 mr-1" /> Near Me</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-36 bg-white text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="soonest">Soonest</SelectItem><SelectItem value="nearest">Nearest</SelectItem><SelectItem value="newest">Newest</SelectItem></SelectContent></Select>
        <Select value={eventType} onValueChange={setEventType}><SelectTrigger className="w-40 bg-white text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Event Types</SelectItem><SelectItem value="single">Single Location</SelectItem><SelectItem value="multi_spot">Multi-Spot</SelectItem><SelectItem value="multi_location">Multi-Location</SelectItem></SelectContent></Select>
        <Select value={distance} onValueChange={setDistance}><SelectTrigger className="w-36 bg-white text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any Distance</SelectItem><SelectItem value="25">Within 25 mi</SelectItem><SelectItem value="50">Within 50 mi</SelectItem><SelectItem value="100">Within 100 mi</SelectItem></SelectContent></Select>
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50"><input type="checkbox" checked={filterOpenToVendors} onChange={(e) => setFilterOpenToVendors(e.target.checked)} className="rounded" />Open to Vendors</label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50"><input type="checkbox" checked={filterAvailableVendorSpots} onChange={(e) => setFilterAvailableVendorSpots(e.target.checked)} className="rounded" />Available Vendor Spots</label>
        <div className="ml-auto text-xs text-slate-400">{discoveryEvents.length} event{discoveryEvents.length !== 1 ? "s" : ""} found</div>
      </div>

      {discoveryEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" /><p className="font-semibold text-slate-600">No events found</p><p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discoveryEvents.map((event) => <EventHubCard key={event.id} event={event} onView={() => navigate(`/VendorEventPublicPage?id=${event.id}`)} onRequestJoin={() => onRequestJoin(event)} account={account} collaborators={collaborators} />)}
        </div>
      )}
    </div>
  );
}

function EventHubCard({ event, onView, onRequestJoin, account, collaborators }) {
  const organizerName = event.organizer?.business_name || event.organizer_business_name || "Organizer";
  const startDate = event.startDateTime ? format(new Date(event.startDateTime), "MMM d, yyyy") : null;
  const isMyEvent = event.organizer_business_id === account?.id;
  const isCollaborating = collaborators.some((c) => c.event_id === event.id && c.organization_id === account?.id && c.status === "accepted");

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-36 bg-gradient-to-br from-[#5DADA5]/20 to-[#2C4F4E]/20 relative flex items-center justify-center overflow-hidden">
        {event.logo || event.photos?.[0] ? <img src={event.logo || event.photos?.[0]} alt={event.title} className="w-full h-full object-cover" /> : <CalendarDays className="h-12 w-12 text-[#5DADA5]/40" />}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1"><Badge className={`text-[10px] font-semibold ${event.open_to_vendors ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500"}`}>{event.open_to_vendors ? "Open to Vendors" : "Closed"}</Badge>{event.event_type && <Badge className="bg-white/90 text-slate-600 text-[10px] border-slate-200">{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</Badge>}</div>
        {(isMyEvent || isCollaborating) && <div className="absolute top-2 right-2"><Badge className="bg-[#F4A849] text-[#2C4F4E] text-[10px] font-bold border-[#F4A849]">{isMyEvent ? "Mine" : "Co-host"}</Badge></div>}
      </div>
      <CardContent className="p-4 space-y-3">
        <div><h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">{event.title}</h4><div className="flex items-center gap-1 mt-1 text-xs text-slate-500"><Building2 className="h-3 w-3 flex-shrink-0" /><span className="truncate">{organizerName}</span></div></div>
        <div className="space-y-1 text-xs text-slate-500">{event.display_address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{event.display_address}</span></div>}{startDate && <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3 flex-shrink-0" /><span>{startDate}</span></div>}{event.open_to_vendors && event.attendeeCount !== undefined && <div className="flex items-center gap-1"><Users className="h-3 w-3 flex-shrink-0" /><span>{event.attendeeCount} vendor{event.attendeeCount !== 1 ? "s" : ""} attending</span></div>}{event.distanceMiles !== null && event.distanceMiles !== undefined && <div className="flex items-center gap-1 text-[#5DADA5] font-medium"><MapPin className="h-3 w-3 flex-shrink-0" /><span>{event.distanceMiles.toFixed(1)} mi away</span></div>}</div>
        <div className="flex gap-2 pt-1"><Button size="sm" variant="outline" onClick={onView} className="flex-1 text-xs">View Event</Button>{event.open_to_vendors && !isMyEvent && !isCollaborating && <Button size="sm" onClick={onRequestJoin} className="flex-1 text-xs bg-[#2C4F4E] hover:bg-[#3d6b6a] text-white">Request to Join</Button>}</div>
      </CardContent>
    </Card>
  );
}