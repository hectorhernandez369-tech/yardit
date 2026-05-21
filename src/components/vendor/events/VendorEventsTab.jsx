import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPlus, Search, SlidersHorizontal, CalendarDays, Users, TrendingUp, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import VendorEventCard from "./VendorEventCard";
import VendorEventForm from "./VendorEventForm";
import EventCollaboratorsPanel from "./EventCollaboratorsPanel";
import CollaborationInviteReview from "./CollaborationInviteReview";
import { calculateMiles, getVendorEventPermission, getVendorEventStatus } from "@/lib/vendorEvents";
import { getVendorUsageSnapshot } from "@/lib/vendorUsage";
import { canAccessEvent, canEditEvent, canManageCollaborators, canManageFlags, canManageSchedule, canManageVendors, getHostedByLabels } from "@/lib/eventCollaboration";
import { isEligibleEventOrganizer } from "@/lib/vendorAccountIdentity";

const normalizeVendorSearchText = (value) => String(value || "").toLowerCase().trim().replace(/\s+/g, " ");

export default function VendorEventsTab({ account, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [collaboratorEvent, setCollaboratorEvent] = useState(null);
  const [reviewInvite, setReviewInvite] = useState(null);
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

  const { data: vendorAccounts = [] } = useQuery({
    queryKey: ["eventCollaboratorVendorAccounts"],
    queryFn: async () => {
      const accounts = await base44.entities.VendorAccount.list();
      return accounts.filter(isEligibleEventOrganizer);
    },
    initialData: [],
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ["allEventCollaborators"],
    queryFn: () => base44.entities.EventCollaborator.list(),
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

  const currentOrganizationIds = account?.id ? [account.id] : [];
  const pendingCollaborationInvites = collaborators.filter((item) => item.organization_id === account?.id && item.status === "pending");
  const collaborationByEventId = Object.fromEntries(collaborators.filter((item) => item.organization_id === account?.id && item.status === "accepted").map((item) => [item.event_id, item]));
  const organizationById = Object.fromEntries(vendorAccounts.map((item) => [item.id, item]));
  // All usage/permission checks use the selected business account — not user-level tier.
  const usageSnapshot = getVendorUsageSnapshot({ account, events });
  const currentSinglePermission = getVendorEventPermission({ account, events, eventType: "single" });
  const currentMultifieldPermission = getVendorEventPermission({ account, events, eventType: "multi_spot" });
  const currentMultiLocationPermission = getVendorEventPermission({ account, events, eventType: "multi_location" });
  const canCreateAnyEvent = currentSinglePermission.allowed || currentMultifieldPermission.allowed || currentMultiLocationPermission.allowed;

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .map((event) => ({
        ...event,
        distanceMiles: userLocation ? calculateMiles(userLocation.lat, userLocation.lng, event.latitude, event.longitude) : null,
        computedStatus: getVendorEventStatus(event, now),
        approvedVendorCount: attendees.filter((attendee) => attendee.event_id === event.id).length,
      }))
      .filter((event) => canAccessEvent(event, collaborators, currentOrganizationIds) || ["published", "active"].includes(event.status))
      .filter((event) => tab === "history" ? ["completed", "cancelled"].includes(event.computedStatus) : !["completed", "cancelled"].includes(event.computedStatus))
      .filter((event) => !query || normalizeVendorSearchText(`${event.title} ${event.description} ${event.category}`).includes(normalizeVendorSearchText(query)))
      .filter((event) => !locationQuery || normalizeVendorSearchText(event.display_address).includes(normalizeVendorSearchText(locationQuery)))
      .filter((event) => eventType === "all" || event.event_type === eventType)
      .filter((event) => showOpenToVendors ? event.open_to_vendors || canAccessEvent(event, collaborators, currentOrganizationIds) : true)
      .filter((event) => !userLocation || distance === "any" || event.distanceMiles === null || event.distanceMiles <= Number(distance))
      .sort((a, b) => {
        if (sort === "latest") return new Date(b.startDateTime) - new Date(a.startDateTime);
        if (sort === "closest") return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
        return new Date(a.startDateTime) - new Date(b.startDateTime);
      });
  }, [events, attendees, account?.id, tab, query, locationQuery, distance, eventType, showOpenToVendors, sort, userLocation, collaborators, currentOrganizationIds]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteId = params.get("collabInvite");
    if (!inviteId || reviewInvite || !pendingCollaborationInvites.length) return;
    const invite = pendingCollaborationInvites.find((item) => item.id === inviteId);
    if (invite) setReviewInvite(invite);
  }, [location.search, pendingCollaborationInvites, reviewInvite]);

  const activeEvents = events.filter((e) => !["completed", "cancelled"].includes(getVendorEventStatus(e, new Date())));
  const totalVendors = attendees.length;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Events</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your vendor events and track attendance.</p>
        </div>
        <Button
          onClick={() => canCreateAnyEvent ? setShowCreate(true) : alert(`${currentSinglePermission.reason}\n${currentMultifieldPermission.reason}`)}
          className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a] shadow-sm h-10 px-5 gap-2 font-semibold"
        >
          <CalendarPlus className="h-4 w-4" /> Create New Event
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#5DADA5]/10 flex items-center justify-center"><CalendarDays className="h-4 w-4 text-[#5DADA5]" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{activeEvents.length}</p><p className="text-xs text-slate-500">Active Events</p></div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#F4A849]/10 flex items-center justify-center"><Users className="h-4 w-4 text-[#F4A849]" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{totalVendors}</p><p className="text-xs text-slate-500">Total Vendors</p></div>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{pendingCollaborationInvites.length}</p><p className="text-xs text-slate-500">Pending Invites</p></div>
          </div>
        </div>
      </div>

      {/* Search & filter bar */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9 bg-slate-50 border-slate-200" placeholder="Search by event name, category..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-44 bg-slate-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="soonest">Soonest First</SelectItem><SelectItem value="latest">Latest First</SelectItem><SelectItem value="closest">Closest First</SelectItem></SelectContent></Select>
          <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)} className={filtersOpen ? "bg-slate-100" : ""}><SlidersHorizontal className="h-4 w-4 mr-1.5" /> Filters {filtersOpen && <X className="h-3.5 w-3.5 ml-1" />}</Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={showOpenToVendors} onChange={(e) => setShowOpenToVendors(e.target.checked)} className="rounded" />
          <span>Show only events open to vendors</span>
        </label>
        {filtersOpen && (
          <div className="grid gap-3 md:grid-cols-[1fr_160px_200px_auto] pt-2 border-t border-slate-100">
            <Input placeholder="Filter by location..." value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} className="bg-slate-50" />
            <Select value={distance} onValueChange={setDistance}><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">Within 25 mi</SelectItem><SelectItem value="50">Within 50 mi</SelectItem><SelectItem value="100">Within 100 mi</SelectItem><SelectItem value="any">Any distance</SelectItem></SelectContent></Select>
            <Select value={eventType} onValueChange={setEventType}><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Event Types</SelectItem><SelectItem value="single">Single Location</SelectItem><SelectItem value="multi_spot">Multi-Spot</SelectItem><SelectItem value="multi_location">Multi-Location</SelectItem></SelectContent></Select>
            <Button variant="outline" size="sm" onClick={useMyLocation} className="whitespace-nowrap">Use My Location</Button>
          </div>
        )}
      </div>

      {pendingCollaborationInvites.length > 0 && (
        <Card className="rounded-3xl border-amber-200 bg-amber-50">
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="text-lg font-black text-[#2C4F4E]">Collaboration Invites</h3>
              <p className="text-sm text-slate-600">Review pending Event Organizer collaboration invites.</p>
            </div>
            <div className="grid gap-2">
              {pendingCollaborationInvites.map((invite) => {
                const invitedEvent = events.find((event) => event.id === invite.event_id);
                return (
                  <div key={invite.id} className="flex flex-col gap-2 rounded-2xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-[#2C4F4E]">{invitedEvent?.title || "Event invite"}</p>
                      <p className="text-xs text-slate-500">From: {invitedEvent?.organizer_business_name || "Event owner"}</p>
                    </div>
                    <Button size="sm" onClick={() => setReviewInvite(invite)}>Review Invite</Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="active">Active Events</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
        <TabsContent value={tab} className="space-y-3">
          {filteredEvents.length ? filteredEvents.map((event) => (
            <VendorEventCard
              key={event.id}
              event={event}
              distanceMiles={event.distanceMiles}
              approvedVendorCount={event.approvedVendorCount}
              hostedLabels={getHostedByLabels(event, collaborators, vendorAccounts)}
              isCollaborating={!!collaborationByEventId[event.id]}
              ownerName={organizationById[event.organizer_business_id]?.business_name || event.organizer_business_name}
              canEdit={canEditEvent(event, collaborators, currentOrganizationIds)}
              canManageVendors={canManageVendors(event, collaborators, currentOrganizationIds)}
              canManageFlags={canManageFlags(event, collaborators, currentOrganizationIds)}
              canManageSchedule={canManageSchedule(event, collaborators, currentOrganizationIds)}
              canManageCollaborators={canManageCollaborators(event, collaborators, currentOrganizationIds)}
              onEdit={() => setEditingEvent(event)}
              onManage={() => navigate(`/VendorEventDashboard?id=${event.id}`)}
              onEditFlags={() => navigate(`/VendorEventFlags?id=${event.id}`)}
              onSchedule={() => navigate(`/VendorEventSchedule?id=${event.id}`)}
              onCollaborators={() => setCollaboratorEvent(event)}
              onView={() => navigate(`/VendorEventPublicPage?id=${event.id}`)}
            />
          )) : (
            <Card className="border-dashed border-slate-300 bg-white shadow-none">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center"><CalendarDays className="h-6 w-6 text-slate-400" /></div>
                <div><p className="font-semibold text-slate-700">No events found</p><p className="text-sm text-slate-500 mt-1">{tab === "active" ? "Create your first event to get started." : "No past events to show."}</p></div>
                {tab === "active" && canCreateAnyEvent && <Button onClick={() => setShowCreate(true)} className="mt-2 bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]"><CalendarPlus className="h-4 w-4 mr-2" />Create Your First Event</Button>}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 rounded-t-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">Create New Event</DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">Fill in the details below to publish your vendor event on the map.</p>
            </DialogHeader>
          </div>
          <div className="px-6 py-5">
            <VendorEventForm account={account} user={user} existingEvents={events} onCreated={() => { queryClient.invalidateQueries({ queryKey: ["vendorEvents"] }); setShowCreate(false); }} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!collaboratorEvent} onOpenChange={(open) => !open && setCollaboratorEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Collaborators</DialogTitle></DialogHeader>
          {collaboratorEvent && (
            <EventCollaboratorsPanel
              event={collaboratorEvent}
              currentUser={user}
              currentOrganizationIds={currentOrganizationIds}
              organizations={vendorAccounts}
              collaborators={collaborators}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ["allEventCollaborators"] });
                queryClient.invalidateQueries({ queryKey: ["vendorEvents"] });
              }}
              asPanel={false}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewInvite} onOpenChange={(open) => !open && setReviewInvite(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review Collaboration Invite</DialogTitle></DialogHeader>
          {reviewInvite && (
            <CollaborationInviteReview
              invite={reviewInvite}
              event={events.find((event) => event.id === reviewInvite.event_id)}
              receivingOrganization={account}
              invitingOrganization={organizationById[events.find((event) => event.id === reviewInvite.event_id)?.organizer_business_id]}
              onRespond={() => {
                queryClient.invalidateQueries({ queryKey: ["allEventCollaborators"] });
                queryClient.invalidateQueries({ queryKey: ["vendorEvents"] });
                setReviewInvite(null);
              }}
            />
          )}
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
              existingEvents={events}
              preserveOwner
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