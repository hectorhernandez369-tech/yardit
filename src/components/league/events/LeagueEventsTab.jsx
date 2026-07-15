import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CalendarPlus } from "lucide-react";
import VendorEventForm from "@/components/vendor/events/VendorEventForm";
import { getVendorEventStatus } from "@/lib/vendorEvents";
import { formatGameDate } from "@/components/league/schedule/leagueGameUtils";

export default function LeagueEventsTab({ account, user }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const { data: events = [] } = useQuery({ queryKey: ["leagueEvents", account?.id], queryFn: () => base44.entities.VendorEvent.filter({ organizer_business_id: account.id }, "startDateTime"), enabled: !!account?.id, initialData: [] });
  const now = new Date();
  const activeEvents = events.filter((event) => !["completed", "cancelled"].includes(event.status) && (!event.endDateTime || new Date(event.endDateTime) >= now));
  const historyEvents = events.filter((event) => ["completed", "cancelled"].includes(event.status) || (event.endDateTime && new Date(event.endDateTime) < now));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["leagueEvents", account?.id] });

  const eventCard = (event) => <Card key={event.id} className="rounded-2xl bg-white"><CardContent className="p-4 space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-slate-500">{getVendorEventStatus(event)}</p><h3 className="text-lg font-black text-[#2C4F4E]">{event.title}</h3><p className="text-sm text-slate-600">{formatGameDate(event.startDateTime?.slice(0, 10))} · {event.display_address || "Location TBD"}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditingEvent(event)}>Edit</Button><Button size="sm" onClick={() => window.location.assign(`/VendorEventDashboard?id=${event.id}`)} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Manage</Button></div></div></CardContent></Card>;

  return (
    <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black text-slate-900">League Events</h2><p className="text-sm text-slate-500">Create and manage Yardit events for game days, tournaments, and league activities.</p></div><Button onClick={() => setShowCreate(true)} className="gap-2 bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]"><CalendarPlus className="h-4 w-4" /> Create Event</Button></div><Tabs defaultValue="active"><TabsList className="bg-white"><TabsTrigger value="active">Active Events</TabsTrigger><TabsTrigger value="history">Event History</TabsTrigger></TabsList><TabsContent value="active" className="mt-4 space-y-3">{activeEvents.length ? activeEvents.map(eventCard) : <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No active league events yet.</p>}</TabsContent><TabsContent value="history" className="mt-4 space-y-3">{historyEvents.length ? historyEvents.map(eventCard) : <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">No event history yet.</p>}</TabsContent></Tabs><Dialog open={showCreate} onOpenChange={setShowCreate}><DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto"><DialogTitle>Create League Event</DialogTitle><VendorEventForm account={account} user={user} existingEvents={events} onCreated={() => { refresh(); setShowCreate(false); }} /></DialogContent></Dialog><Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}><DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto"><DialogTitle>Edit League Event</DialogTitle>{editingEvent && <VendorEventForm account={account} user={user} event={editingEvent} mode="public" existingEvents={events} preserveOwner onCreated={() => { refresh(); setEditingEvent(null); }} />}</DialogContent></Dialog></div>
  );
}