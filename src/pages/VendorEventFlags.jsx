import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import EventFlagCard from "@/components/vendor/events/EventFlagCard";
import EventFlagIconPicker from "@/components/vendor/events/EventFlagIconPicker";
import FlagScheduleEditor from "@/components/vendor/events/FlagScheduleEditor";
import { getEventFlagIcon } from "@/lib/eventFlagIcons";
import { safeBack } from "@/utils";
import { toast } from "sonner";

export default function VendorEventFlags() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventId = new URLSearchParams(window.location.search).get("id");
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [draftSpot, setDraftSpot] = useState(null);
  const [timeBetweenMinutes, setTimeBetweenMinutes] = useState("90");

  const { data: user } = useQuery({ queryKey: ["flagManagerUser"], queryFn: () => base44.auth.me() });
  const { data: events = [], isLoading: loadingEvent } = useQuery({ queryKey: ["flagManagerEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const event = events[0];
  const { data: spots = [], isLoading: loadingSpots } = useQuery({ queryKey: ["flagManagerSpots", eventId], queryFn: () => base44.entities.EventSpot.filter({ event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });

  const sortedSpots = useMemo(() => [...spots].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)), [spots]);
  const selectedSpot = sortedSpots.find((spot) => spot.id === selectedSpotId) || sortedSpots[0];
  const canManage = !!event && !!user && event.organizer_user_id === user.id;

  useEffect(() => {
    if (!selectedSpotId && sortedSpots[0]?.id) setSelectedSpotId(sortedSpots[0].id);
  }, [sortedSpots, selectedSpotId]);

  useEffect(() => {
    if (selectedSpot) {
      setDraftSpot({
        ...selectedSpot,
        title: selectedSpot.title || selectedSpot.label || "Flag",
        icon_key: selectedSpot.icon_key || "flag",
        schedule_entries: selectedSpot.schedule_entries || [],
      });
    }
  }, [selectedSpot?.id]);

  const saveSpot = async () => {
    await base44.entities.EventSpot.update(draftSpot.id, {
      title: draftSpot.title,
      label: draftSpot.title,
      icon_key: draftSpot.icon_key || "flag",
      description: draftSpot.description || "",
      schedule_entries: (draftSpot.schedule_entries || []).map((entry, index) => ({ ...entry, sort_order: index })),
      updated_at: new Date().toISOString(),
    });
    toast.success("Flag updated");
    queryClient.invalidateQueries({ queryKey: ["flagManagerSpots", eventId] });
  };

  if (loadingEvent || loadingSpots) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!event) return <div className="p-6 text-center">Event not found.</div>;
  if (!canManage) return <div className="p-6 text-center">You do not have access to edit these flags.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => safeBack(navigate, `/VendorEventDashboard?id=${event.id}`)} className="bg-white"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={() => navigate(`/VendorEventPublicPage?id=${event.id}`)} variant="outline" className="bg-white">View Public Page</Button>
      </div>

      <Card className="rounded-3xl bg-white">
        <CardContent className="p-5">
          <h1 className="text-3xl font-black text-[#2C4F4E]">Edit Flags</h1>
          <p className="text-slate-600">Manage flag names, icons, and schedules for {event.title}.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {sortedSpots.length ? sortedSpots.map((spot) => (
            <EventFlagCard key={spot.id} spot={spot} selected={spot.id === selectedSpot?.id} onEdit={() => setSelectedSpotId(spot.id)} />
          )) : (
            <Card><CardContent className="p-6 text-center text-slate-500">No flags found. Place flags from the event location editor first.</CardContent></Card>
          )}
        </div>

        {draftSpot && (
          <Card className="rounded-3xl bg-white">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#2C4F4E] bg-[#F4A849] text-2xl">{getEventFlagIcon(draftSpot.icon_key)}</span>
                <div>
                  <h2 className="text-2xl font-black text-[#2C4F4E]">Flag Detail Editor</h2>
                  <p className="text-sm text-slate-500">This name appears publicly on the map.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[#2C4F4E]">Flag Name</Label>
                <Input value={draftSpot.title || ""} onChange={(e) => setDraftSpot((prev) => ({ ...prev, title: e.target.value }))} placeholder="Field 1, Main Stage, Food Court" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[#2C4F4E]">Icon</Label>
                <EventFlagIconPicker value={draftSpot.icon_key || "flag"} onChange={(iconKey) => setDraftSpot((prev) => ({ ...prev, icon_key: iconKey }))} />
              </div>

              <FlagScheduleEditor
                entries={draftSpot.schedule_entries || []}
                eventDate={event.startDateTime}
                timeBetweenMinutes={timeBetweenMinutes}
                onTimeBetweenChange={setTimeBetweenMinutes}
                onChange={(entries) => setDraftSpot((prev) => ({ ...prev, schedule_entries: entries }))}
              />

              <div className="space-y-2">
                <Label className="font-bold text-[#2C4F4E]">Optional Description</Label>
                <Textarea value={draftSpot.description || ""} onChange={(e) => setDraftSpot((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional details for this flag" />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSpot} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"><Save className="h-4 w-4" /> Save Flag</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}