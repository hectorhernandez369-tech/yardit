import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import EventFlagCard from "@/components/vendor/events/EventFlagCard";
import EventFlagQuickEditPanel from "@/components/vendor/events/EventFlagQuickEditPanel";
import { safeBack } from "@/utils";
import { toast } from "sonner";
import { canManageFlags } from "@/lib/eventCollaboration";

export default function VendorEventFlags() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventId = new URLSearchParams(window.location.search).get("id");
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [draftSpot, setDraftSpot] = useState(null);
  const [timeBetweenMinutes, setTimeBetweenMinutes] = useState("90");
  const [isSavingSpot, setIsSavingSpot] = useState(false);

  const { data: user, isLoading: loadingUser } = useQuery({ queryKey: ["flagManagerUser"], queryFn: () => base44.auth.me() });
  const { data: events = [], isLoading: loadingEvent } = useQuery({ queryKey: ["flagManagerEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const event = events[0];
  const { data: spots = [], isLoading: loadingSpots } = useQuery({ queryKey: ["flagManagerSpots", eventId], queryFn: () => base44.entities.EventSpot.filter({ event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });
  const { data: vendorAccounts = [], isLoading: loadingVendorAccounts } = useQuery({ queryKey: ["flagManagerVendorAccounts"], queryFn: () => base44.entities.VendorAccount.list(), initialData: [] });
  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({ queryKey: ["flagManagerCollaborators", eventId], queryFn: () => base44.entities.EventCollaborator.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });

  const sortedSpots = useMemo(() => [...spots].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)), [spots]);
  const selectedSpot = sortedSpots.find((spot) => spot.id === selectedSpotId) || null;
  const currentOrganizationIds = vendorAccounts.filter((account) => account.owner_user_id === user?.id || account.owner_user_id === user?.email || account.owner_email === user?.email).map((account) => account.id);
  const canManage = !!event && !!user && canManageFlags(event, collaborators, currentOrganizationIds);

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

  const saveSpot = async ({ applyToAll, originalSpot }) => {
    setIsSavingSpot(true);
    const now = new Date().toISOString();
    const changedSharedFields = {};

    if ((draftSpot.icon_key || "flag") !== (originalSpot.icon_key || "flag")) {
      changedSharedFields.icon_key = draftSpot.icon_key || "flag";
    }
    if ((draftSpot.description || "") !== (originalSpot.description || "")) {
      changedSharedFields.description = draftSpot.description || "";
    }

    await base44.entities.EventSpot.update(draftSpot.id, {
      title: draftSpot.title,
      label: draftSpot.title,
      icon_key: draftSpot.icon_key || "flag",
      description: draftSpot.description || "",
      schedule_entries: (draftSpot.schedule_entries || []).map((entry, index) => ({ ...entry, sort_order: index })),
      updated_at: now,
    });

    if (applyToAll && Object.keys(changedSharedFields).length > 0) {
      await Promise.all(
        sortedSpots
          .filter((spot) => spot.id !== draftSpot.id)
          .map((spot) => base44.entities.EventSpot.update(spot.id, { ...changedSharedFields, updated_at: now }))
      );
    }

    toast.success(applyToAll && Object.keys(changedSharedFields).length > 0 ? "Flag updated and shared settings applied" : "Flag updated");
    setSelectedSpotId(null);
    setDraftSpot(null);
    setIsSavingSpot(false);
    queryClient.invalidateQueries({ queryKey: ["flagManagerSpots", eventId] });
  };

  if (loadingEvent || loadingSpots || loadingUser || loadingVendorAccounts || loadingCollaborators) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!event) return <div className="p-6 text-center">Event not found.</div>;
  if (!canManage) return <div className="p-6 text-center text-[#2C4F4E] font-bold">You do not have permission for this action.</div>;

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

      <div className="space-y-3">
        {sortedSpots.length ? sortedSpots.map((spot) => (
          <div key={spot.id}>
            <EventFlagCard spot={spot} selected={spot.id === selectedSpot?.id} onEdit={() => setSelectedSpotId((current) => current === spot.id ? null : spot.id)} />
            {draftSpot && selectedSpot?.id === spot.id && (
              <EventFlagQuickEditPanel
                draftSpot={draftSpot}
                setDraftSpot={setDraftSpot}
                originalSpot={selectedSpot}
                eventDate={event.startDateTime}
                timeBetweenMinutes={timeBetweenMinutes}
                onTimeBetweenChange={setTimeBetweenMinutes}
                onSave={saveSpot}
                onCancel={() => {
                  setSelectedSpotId(null);
                  setDraftSpot(null);
                }}
                isSaving={isSavingSpot}
              />
            )}
          </div>
        )) : (
          <Card><CardContent className="p-6 text-center text-slate-500">No flags found. Place flags from the event location editor first.</CardContent></Card>
        )}
      </div>
    </div>
  );
}