import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarPlus, Eye, MapPin, Pencil, Settings, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import VendorEventForm from "@/components/vendor/events/VendorEventForm";
import { getVendorEventStatus } from "@/lib/vendorEvents";
import { formatGameDate } from "@/components/league/schedule/leagueGameUtils";

const buildLeagueEventReturnState = (eventId, eventSubtab = "active") => ({
  returnPage: "LeagueTeamDashboard",
  returnTab: "events",
  selectedEventId: eventId,
  restoreEvent: true,
  eventSubtab,
});

const saveEventCardPosition = (eventId) => {
  if (!eventId) return;
  sessionStorage.setItem(
    "yardit_league_event_restore",
    JSON.stringify({ eventId, scrollY: window.scrollY, savedAt: Date.now() })
  );
};

export default function LeagueEventsTab({ account, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventSubtab, setEventSubtab] = useState(location.state?.eventSubtab || "active");
  const [eventToRemove, setEventToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["leagueEvents", account?.id],
    queryFn: () => base44.entities.VendorEvent.filter({ organizer_business_id: account.id }, "startDateTime"),
    enabled: !!account?.id,
    initialData: [],
  });

  const now = new Date();
  const activeEvents = events.filter((event) => !["completed", "cancelled"].includes(event.status) && (!event.endDateTime || new Date(event.endDateTime) >= now));
  const historyEvents = events.filter((event) => ["completed", "cancelled"].includes(event.status) || (event.endDateTime && new Date(event.endDateTime) < now));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["leagueEvents", account?.id] });

  useEffect(() => {
    const selectedEventId = location.state?.selectedEventId || new URLSearchParams(location.search).get("eventId");
    if (!selectedEventId || !events?.length) return;

    if (historyEvents.some((event) => String(event.id) === String(selectedEventId))) {
      setEventSubtab("history");
    } else if (activeEvents.some((event) => String(event.id) === String(selectedEventId))) {
      setEventSubtab("active");
    }

    const timer = window.setTimeout(() => {
      const card = document.getElementById(`league-event-card-${selectedEventId}`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      sessionStorage.removeItem("yardit_league_event_restore");
    }, 150);

    return () => window.clearTimeout(timer);
  }, [events, activeEvents, historyEvents, location.search, location.state]);

  const handleManageEvent = (event) => {
    if (!event?.id) return;
    window.location.assign(`/VendorEventDashboard?id=${event.id}`);
  };

  const handleEditEvent = (event) => {
    if (!event?.id) return;
    setEditingEvent(event);
  };

  const handleViewInfo = (event) => {
    if (!event?.id) return;
    saveEventCardPosition(event.id);
    navigate(`/VendorEventDetail?id=${encodeURIComponent(event.id)}&organizerPreview=1`, { state: buildLeagueEventReturnState(event.id, eventSubtab) });
  };

  const handleViewOnMap = (event) => {
    if (!event?.id) return;
    saveEventCardPosition(event.id);
    navigate(`/Home?eventId=${encodeURIComponent(event.id)}&organizerPreview=1`, { state: buildLeagueEventReturnState(event.id, eventSubtab) });
  };

  const confirmRemoveEvent = async () => {
    if (!eventToRemove?.id || eventToRemove.organizer_business_id !== account?.id) return;
    setIsRemoving(true);
    try {
      if (eventToRemove.status === "draft") {
        await base44.entities.VendorEvent.delete(eventToRemove.id);
        toast.success("Draft deleted permanently.");
      } else {
        await base44.entities.VendorEvent.update(eventToRemove.id, {
          status: "cancelled",
          visibility_status: "cancelled",
          updated_at: new Date().toISOString(),
        });
        toast.success("Event cancelled and moved to History.");
        setEventSubtab("history");
      }
      setEventToRemove(null);
      await refresh();
    } catch (error) {
      console.error("Failed to remove league event:", error);
      toast.error("Could not update this event. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const eventCard = (event, isHistory = false) => (
    <div id={`league-event-card-${event.id}`} data-event-id={event.id} key={event.id}>
      <Card className="rounded-2xl bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">{getVendorEventStatus(event)}</p>
              <h3 className="text-lg font-black text-[#2C4F4E]">{event.title}</h3>
              <p className="text-sm text-slate-600">{formatGameDate(event.startDateTime?.slice(0, 10))} · {event.display_address || "Location TBD"}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button type="button" onClick={() => handleManageEvent(event)} className="w-full rounded-xl bg-[#2C5F5B] font-bold text-white hover:bg-[#244f4c]">
                <Settings className="mr-2 h-4 w-4" /> Manage
              </Button>
              <Button type="button" variant="outline" onClick={() => handleViewInfo(event)} className="w-full rounded-xl border-[#5DADA5] font-bold text-[#2C5F5B]">
                <Eye className="mr-2 h-4 w-4" /> View Info
              </Button>
              <Button type="button" variant="outline" onClick={() => handleEditEvent(event)} className="w-full rounded-xl font-bold">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button type="button" variant="outline" onClick={() => handleViewOnMap(event)} className="w-full rounded-xl font-bold">
                <MapPin className="mr-2 h-4 w-4" /> View on Map
              </Button>
              {!isHistory && (
                <Button type="button" variant="outline" onClick={() => setEventToRemove(event)} className="col-span-2 w-full rounded-xl border-red-200 font-bold text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="mr-2 h-4 w-4" /> {event.status === "draft" ? "Delete Draft" : "Delete Event"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">League Events</h2>
          <p className="text-sm text-slate-500">Create and manage Yardit events for game days, tournaments, and league activities.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]"><CalendarPlus className="h-4 w-4" /> Create Event</Button>
      </div>

      <Tabs value={eventSubtab} onValueChange={setEventSubtab}>
        <TabsList className="bg-white">
          <TabsTrigger value="active">Active Events</TabsTrigger>
          <TabsTrigger value="history">Event History</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4 space-y-3">{activeEvents.length ? activeEvents.map((event) => eventCard(event, false)) : <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No active league events yet.</p>}</TabsContent>
        <TabsContent value="history" className="mt-4 space-y-3">{historyEvents.length ? historyEvents.map((event) => eventCard(event, true)) : <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No event history yet.</p>}</TabsContent>
      </Tabs>

      <Dialog open={!!eventToRemove} onOpenChange={(open) => !open && !isRemoving && setEventToRemove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <TriangleAlert className="h-5 w-5" /> {eventToRemove?.status === "draft" ? "Delete Draft?" : "Cancel Event?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {eventToRemove?.status === "draft"
                ? <>Delete <strong>“{eventToRemove?.title || "this draft"}”</strong> permanently?</>
                : <>Remove <strong>“{eventToRemove?.title || "this event"}”</strong> from Active Events?</>}
            </p>
            <div className={`rounded-xl border p-3 text-sm ${eventToRemove?.status === "draft" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              {eventToRemove?.status === "draft"
                ? "This draft has never been published and will be permanently deleted. This cannot be undone."
                : <>The event will not be permanently deleted. It will be marked <strong>Cancelled</strong> and moved to <strong>Event History</strong>.</>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={isRemoving} onClick={() => setEventToRemove(null)}>Keep Event</Button>
              <Button disabled={isRemoving} onClick={confirmRemoveEvent} className="bg-red-600 text-white hover:bg-red-700">
                {isRemoving ? "Updating…" : eventToRemove?.status === "draft" ? "Yes, Delete Draft" : "Yes, Cancel Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogTitle>Create League Event</DialogTitle>
          <VendorEventForm account={account} user={user} existingEvents={events} onCreated={() => { refresh(); setShowCreate(false); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogTitle>Edit League Event</DialogTitle>
          {editingEvent && <VendorEventForm account={account} user={user} event={editingEvent} mode="public" existingEvents={events} preserveOwner onCreated={() => { refresh(); setEditingEvent(null); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}