import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Store, CalendarDays, Clock, FileText } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import VendorEventForm from "./VendorEventForm";
import EventCollaboratorsPanel from "./EventCollaboratorsPanel";
import CollaborationInviteReview from "./CollaborationInviteReview";
import EventsHubTab from "./EventsHubTab";
import MyActiveEventsTab from "./MyActiveEventsTab";
import EventHistoryTab from "./EventHistoryTab";
import CreateEventDraftGate from "./CreateEventDraftGate";
import DraftEventCard from "./DraftEventCard";
import { getVendorEventPermission } from "@/lib/vendorEvents";
import { isEligibleEventOrganizer } from "@/lib/vendorAccountIdentity";
import { pickOrganizerDrafts } from "@/lib/vendorEventDraft";

export default function VendorEventsTab({ account, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const initialParams = new URLSearchParams(location.search);
  const [tab, setTab] = useState(initialParams.get("subtab") || "hub");
  const [showCreate, setShowCreate] = useState(initialParams.get("create") === "1");
  const [editingEvent, setEditingEvent] = useState(null);
  const [collaboratorEvent, setCollaboratorEvent] = useState(null);
  const [reviewInvite, setReviewInvite] = useState(null);
  // Draft resume state: when set, the Create dialog loads this draft into the form.
  const [resumeDraft, setResumeDraft] = useState(null);
  const [showDraftGate, setShowDraftGate] = useState(false);

  const updateEventsUrl = (changes) => {
    const params = new URLSearchParams(location.search);
    if (changes.subtab !== undefined) {
      if (changes.subtab) params.set("subtab", changes.subtab);
      else params.delete("subtab");
    }
    if (changes.create !== undefined) {
      if (changes.create) params.set("create", "1");
      else params.delete("create");
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleSubTabChange = (nextTab) => {
    setTab(nextTab);
    updateEventsUrl({ subtab: nextTab });
  };

  const { data: events = [] } = useQuery({
    queryKey: ["vendorEvents"],
    queryFn: () => base44.entities.VendorEvent.list("startDateTime"),
    initialData: [],
  });

  const drafts = pickOrganizerDrafts(events, account?.id);

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

  const currentOrganizationIds = account?.id ? [account.id] : [];
  const pendingCollaborationInvites = collaborators.filter(
    (item) => item.organization_id === account?.id && item.status === "pending"
  );

  const currentSinglePermission = getVendorEventPermission({ account, events, eventType: "single" });
  const currentMultifieldPermission = getVendorEventPermission({ account, events, eventType: "multi_spot" });
  const currentMultiLocationPermission = getVendorEventPermission({ account, events, eventType: "multi_location" });
  const canCreateAnyEvent = currentSinglePermission.allowed || currentMultifieldPermission.allowed || currentMultiLocationPermission.allowed;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteId = params.get("collabInvite");
    if (!inviteId || reviewInvite || !pendingCollaborationInvites.length) return;
    const invite = pendingCollaborationInvites.find((item) => item.id === inviteId);
    if (invite) {
      setReviewInvite(invite);
      setTab("active");
    }
  }, [location.search, pendingCollaborationInvites, reviewInvite]);

  const handleRepeatHost = (event) => {
    setEditingEvent({ ...event, id: undefined, status: "draft", title: `${event.title} (Copy)` });
    setResumeDraft(null);
    setShowCreate(true);
    updateEventsUrl({ create: true });
  };

  const handleRequestJoin = (event) => {
    navigate(`/VendorEventPublicPage?id=${event.id}`);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["vendorEvents"] });
    queryClient.invalidateQueries({ queryKey: ["allEventCollaborators"] });
  };

  // --- Create Event entry with draft resume gate ---
  const openCreate = () => {
    if (drafts.length > 0) {
      setShowDraftGate(true);
      return;
    }
    setResumeDraft(null);
    setShowCreate(true);
    updateEventsUrl({ create: true });
  };

  const closeCreate = (open) => {
    setShowCreate(open);
    if (!open) {
      updateEventsUrl({ create: false });
      setResumeDraft(null);
    }
  };

  const continueDraft = () => {
    setShowDraftGate(false);
    setResumeDraft(drafts[0]);
    setShowCreate(true);
    updateEventsUrl({ create: true });
  };

  const startNewEvent = async () => {
    setShowDraftGate(false);
    await deleteAllDrafts();
    setResumeDraft(null);
    setShowCreate(true);
    updateEventsUrl({ create: true });
  };

  const deleteAllDrafts = async () => {
    await Promise.all(drafts.map((d) => base44.entities.VendorEvent.delete(d.id).catch(() => {})));
    invalidate();
  };

  const deleteDraft = async (draft) => {
    await base44.entities.VendorEvent.delete(draft.id).catch(() => {});
    invalidate();
  };

  const editDraft = (draft) => {
    setResumeDraft(draft);
    setShowCreate(true);
    updateEventsUrl({ create: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Events</h2>
          <p className="text-sm text-slate-500 mt-0.5">Discover events to join and manage the ones you host.</p>
        </div>
        <Button
          onClick={() => canCreateAnyEvent ? openCreate() : alert(`${currentSinglePermission.reason}`)}
          className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a] shadow-sm h-10 px-5 gap-2 font-semibold"
        >
          <CalendarPlus className="h-4 w-4" /> Create New Event
        </Button>
      </div>

      <Tabs value={tab} onValueChange={handleSubTabChange}>
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl gap-1">
          <TabsTrigger value="hub" className="rounded-lg gap-1.5 data-[state=active]:bg-[#2C4F4E] data-[state=active]:text-white">
            <Store className="h-3.5 w-3.5" /> Events Hub
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg gap-1.5 data-[state=active]:bg-[#2C4F4E] data-[state=active]:text-white">
            <CalendarDays className="h-3.5 w-3.5" /> My Active Events
            {pendingCollaborationInvites.length > 0 && (
              <Badge className="bg-[#F4A849] text-[#2C4F4E] text-[10px] font-bold ml-1 px-1.5 py-0 min-w-0">
                {pendingCollaborationInvites.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-lg gap-1.5 data-[state=active]:bg-[#2C4F4E] data-[state=active]:text-white">
            <FileText className="h-3.5 w-3.5" /> Drafts
            {drafts.length > 0 && (
              <Badge className="bg-amber-400 text-amber-900 text-[10px] font-bold ml-1 px-1.5 py-0 min-w-0">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg gap-1.5 data-[state=active]:bg-[#2C4F4E] data-[state=active]:text-white">
            <Clock className="h-3.5 w-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hub" className="mt-5">
          <EventsHubTab
            events={events}
            attendees={attendees}
            vendorAccounts={vendorAccounts}
            collaborators={collaborators}
            account={account}
            onRequestJoin={handleRequestJoin}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-5">
          <MyActiveEventsTab
            events={events}
            attendees={attendees}
            collaborators={collaborators}
            vendorAccounts={vendorAccounts}
            account={account}
            user={user}
            canCreateAnyEvent={canCreateAnyEvent}
            onCreateEvent={openCreate}
            onEditEvent={setEditingEvent}
            onCollaborators={setCollaboratorEvent}
            navigate={navigate}
            pendingCollaborationInvites={pendingCollaborationInvites}
            onReviewInvite={setReviewInvite}
          />
        </TabsContent>

        <TabsContent value="drafts" className="mt-5">
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-slate-800">Event Drafts</h4>
              <p className="text-xs text-slate-500">Unfinished events in progress. Drafts are private — they never appear publicly or accept vendors.</p>
            </div>
            {drafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-3">
                <FileText className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No drafts. Start creating an event to see it here.</p>
                {canCreateAnyEvent && (
                  <Button size="sm" onClick={openCreate} className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]"><CalendarPlus className="h-4 w-4 mr-1" /> Create Event</Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {drafts.map((draft) => (
                  <DraftEventCard
                    key={draft.id}
                    draft={draft}
                    onEdit={() => editDraft(draft)}
                    onDelete={() => {
                      if (window.confirm("Delete this draft permanently?")) deleteDraft(draft);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <EventHistoryTab
            events={events}
            attendees={attendees}
            account={account}
            navigate={navigate}
            onRepeatHost={handleRepeatHost}
          />
        </TabsContent>
      </Tabs>

      {/* Resume-draft gate — shown when opening Create with an existing draft */}
      <CreateEventDraftGate
        open={showDraftGate}
        onOpenChange={setShowDraftGate}
        drafts={drafts}
        onContinue={continueDraft}
        onStartNew={startNewEvent}
        onDeleteAll={async () => {
          await deleteAllDrafts();
          setShowDraftGate(false);
        }}
      />

      {/* Create event dialog — loads the resumeDraft (if any) into the form */}
      <Dialog open={showCreate} onOpenChange={closeCreate}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 rounded-t-lg flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">{resumeDraft ? "Continue Event Draft" : "Create New Event"}</DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">Your progress is saved automatically as you edit.</p>
            </div>
            <button
              onClick={() => setShowCreate(false)}
              className="mt-0.5 shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="px-6 py-5">
            <VendorEventForm
              account={account}
              user={user}
              existingEvents={events}
              draftEvent={resumeDraft}
              onDraftChanged={invalidate}
              onCreated={() => { invalidate(); closeCreate(false); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit event dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader><DialogTitle>Edit Event Details</DialogTitle></DialogHeader>
          {editingEvent && (
            <VendorEventForm
              account={account}
              user={user}
              event={editingEvent}
              approvedVendorCount={editingEvent.approvedVendorCount}
              mode="public"
              existingEvents={events}
              preserveOwner
              onCreated={() => { invalidate(); setEditingEvent(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Collaborators dialog */}
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
              onRefresh={invalidate}
              asPanel={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Review invite dialog */}
      <Dialog open={!!reviewInvite} onOpenChange={(open) => !open && setReviewInvite(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review Collaboration Invite</DialogTitle></DialogHeader>
          {reviewInvite && (
            <CollaborationInviteReview
              invite={reviewInvite}
              event={events.find((e) => e.id === reviewInvite.event_id)}
              receivingOrganization={account}
              invitingOrganization={vendorAccounts.find((a) => a.id === events.find((e) => e.id === reviewInvite.event_id)?.organizer_business_id)}
              onRespond={() => { invalidate(); setReviewInvite(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}