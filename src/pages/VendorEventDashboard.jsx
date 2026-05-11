import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CalendarClock, Flag, Loader2, Mail, Users } from "lucide-react";
import { format } from "date-fns";
import EventSpotManager from "@/components/vendor/events/EventSpotManager";
import InviteVendorsModal from "@/components/vendor/events/InviteVendorsModal";
import VendorEventForm from "@/components/vendor/events/VendorEventForm";
import CollapsiblePanel from "@/components/vendor/events/CollapsiblePanel";
import EventUpdatesManager from "@/components/vendor/events/EventUpdatesManager";
import EventCollaboratorsPanel from "@/components/vendor/events/EventCollaboratorsPanel";
import { formatVendorEventType, getVendorEventStatus } from "@/lib/vendorEvents";
import { canAccessEvent, canEditEvent, canManageCollaborators, canManageFlags, canManageSchedule, canManageVendors, canPostUpdates, getHostedByLabels } from "@/lib/eventCollaboration";
import { toast } from "sonner";
import { safeBack } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function VendorEventDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventId = new URLSearchParams(window.location.search).get("id");
  const [showInviteVendors, setShowInviteVendors] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  const { data: currentUser } = useQuery({ queryKey: ["vendorEventDashboardUser"], queryFn: () => base44.auth.me() });
  const { data: events = [], isLoading } = useQuery({ queryKey: ["vendorEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: allVendorEvents = [] } = useQuery({ queryKey: ["vendorEventsForPermission"], queryFn: () => base44.entities.VendorEvent.list("startDateTime"), initialData: [] });
  const event = events[0];
  const { data: requests = [] } = useQuery({ queryKey: ["eventVendorRequests", eventId], queryFn: () => base44.entities.EventVendorRequest.filter({ event_id: eventId }, "-created_date"), enabled: !!eventId, initialData: [] });
  const { data: attendees = [] } = useQuery({ queryKey: ["eventVendorAttendees", eventId], queryFn: () => base44.entities.EventVendorAttendee.filter({ event_id: eventId }, "-created_date"), enabled: !!eventId, initialData: [] });
  const { data: spots = [] } = useQuery({ queryKey: ["eventSpots", eventId], queryFn: () => base44.entities.EventSpot.filter({ event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });
  const { data: invites = [] } = useQuery({ queryKey: ["eventInvites", eventId], queryFn: () => base44.entities.EventInviteCode.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: vendorInvites = [] } = useQuery({ queryKey: ["eventVendorInvites", eventId], queryFn: () => base44.entities.EventVendorInvite.filter({ event_id: eventId }, "-created_date"), enabled: !!eventId, initialData: [] });
  const { data: vendorAccounts = [] } = useQuery({ queryKey: ["eventInviteVendorAccounts"], queryFn: () => base44.entities.VendorAccount.list(), initialData: [] });
  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({ queryKey: ["eventCollaborators", eventId], queryFn: () => base44.entities.EventCollaborator.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });
  const { data: updates = [] } = useQuery({ queryKey: ["eventUpdates", eventId], queryFn: () => base44.entities.EventUpdate.filter({ event_id: eventId, is_deleted: false }, "-created_at"), enabled: !!eventId, initialData: [] });
  const organizerAccount = vendorAccounts.find((account) => account.id === event?.organizer_business_id);
  const currentOrganizationIds = vendorAccounts.filter((account) => account.owner_user_id === currentUser?.id || account.owner_user_id === currentUser?.email).map((account) => account.id);
  const hostedLabels = getHostedByLabels(event, collaborators, vendorAccounts);
  const canEdit = canEditEvent(event, collaborators, currentOrganizationIds);
  const canVendors = canManageVendors(event, collaborators, currentOrganizationIds);
  const canSchedule = canManageSchedule(event, collaborators, currentOrganizationIds);
  const canFlags = canManageFlags(event, collaborators, currentOrganizationIds);
  const canCollaborators = canManageCollaborators(event, collaborators, currentOrganizationIds);
  const canUpdates = canPostUpdates(event, collaborators, currentOrganizationIds);
  const canAccessDashboard = canAccessEvent(event, collaborators, currentOrganizationIds);

  const pendingRequests = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const invitedVendors = useMemo(() => vendorInvites.filter((invite) => invite.status === "invited"), [vendorInvites]);
  const pendingInvites = useMemo(() => vendorInvites.filter((invite) => ["accepted", "pending_setup", "pending_payment"].includes(invite.status)), [vendorInvites]);
  const vendorById = useMemo(() => Object.fromEntries(vendorAccounts.map((vendor) => [vendor.id, vendor])), [vendorAccounts]);
  const spotsLeft = event?.max_vendors ? Math.max(Number(event.max_vendors) - attendees.length, 0) : null;
  const isFull = spotsLeft === 0;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["eventVendorRequests", eventId] });
    queryClient.invalidateQueries({ queryKey: ["eventVendorAttendees", eventId] });
    queryClient.invalidateQueries({ queryKey: ["eventVendorInvites", eventId] });
    queryClient.invalidateQueries({ queryKey: ["eventSpots", eventId] });
    queryClient.invalidateQueries({ queryKey: ["eventUpdates", eventId] });
    queryClient.invalidateQueries({ queryKey: ["eventCollaborators", eventId] });
  };

  const approveRequest = async (request) => {
    await base44.entities.EventVendorRequest.update(request.id, { status: "approved", updated_at: new Date().toISOString() });
    await base44.entities.EventVendorAttendee.create({
      event_id: request.event_id,
      vendor_user_id: request.vendor_user_id,
      vendor_business_id: request.vendor_business_id,
      business_name: request.business_name,
      logo: request.logo,
      description: request.request_message,
      approved_request_id: request.id,
      created_at: new Date().toISOString(),
    });
    toast.success("Vendor approved");
    refresh();
  };

  const denyRequest = async (request) => {
    await base44.entities.EventVendorRequest.update(request.id, { status: "denied", updated_at: new Date().toISOString() });
    toast.success("Request denied");
    refresh();
  };

  if (isLoading || loadingCollaborators) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!event) return <div className="p-6 text-center">Event not found.</div>;
  if (!canAccessDashboard) return <div className="p-6 text-center text-[#2C4F4E] font-bold">You do not have permission for this action.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <Button variant="outline" onClick={() => safeBack(navigate, "/VendorDashboard?tab=events")} className="bg-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card className="rounded-3xl bg-white">
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <Badge className="mb-2 bg-[#5DADA5] text-white">{getVendorEventStatus(event)}</Badge>
              <h1 className="text-3xl font-black text-[#2C4F4E]">{event.title}</h1>
              <p className="text-slate-600">{formatVendorEventType(event.event_type)} · {event.category}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCollaborators && <Button variant="outline" onClick={() => setShowCollaborators(true)}><Users className="h-4 w-4" /> Collaborators</Button>}
              {canFlags && ["multi_spot", "multi_location"].includes(event.event_type) && <Button variant="outline" onClick={() => navigate(`/VendorEventFlags?id=${event.id}`)}><Flag className="h-4 w-4" /> Edit Flags</Button>}
              {canSchedule && <Button variant="outline" onClick={() => navigate(`/VendorEventSchedule?id=${event.id}`)}><CalendarClock className="h-4 w-4" /> Schedule</Button>}
              <Button variant="outline" onClick={() => navigate(`/VendorEventPublicPage?id=${event.id}`)}>View Public Page</Button>
            </div>
          </div>
          <p className="text-slate-700">{event.description}</p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><strong>Schedule:</strong> {format(new Date(event.startDateTime), "PPp")} - {format(new Date(event.endDateTime), "PPp")}</p>
            <p><strong>Location:</strong> {event.display_address}</p>
            <p><strong>Hosted By:</strong> {hostedLabels.hostedBy}</p>
            <p><strong>Co-Hosted By:</strong> {hostedLabels.coHostedBy.length ? hostedLabels.coHostedBy.join(", ") : "None yet"}</p>
            {event.open_to_vendors && <p><strong>Vendor setup:</strong> Open to vendors</p>}
            {event.max_vendors && <p><strong>Vendor capacity:</strong> {attendees.length} / {event.max_vendors} spots filled{spotsLeft !== null ? ` · ${spotsLeft} remaining` : ""}</p>}
          </div>
          {invites[0] && <div className="rounded-xl bg-[#FBFAF7] p-3 text-sm"><strong>Invite link:</strong> {invites[0].invite_link}</div>}
        </CardContent>
      </Card>

      <Card className="rounded-3xl bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-[#2C4F4E]">Vendor Management</h2>
              <p className="text-sm text-slate-600">Manage how vendors join, pay, reserve space, and get approved.</p>
            </div>
            <Button variant="outline" disabled={isFull || !canVendors} onClick={() => canVendors ? setShowInviteVendors(true) : toast.error("You do not have permission for this action.")}><Mail className="h-4 w-4" /> Invite Vendors</Button>
          </div>
          {organizerAccount && canVendors && (
            <VendorEventForm
              account={organizerAccount}
              user={{ id: event.organizer_user_id }}
              event={event}
              approvedVendorCount={attendees.length}
              mode="vendor"
              preserveOwner
              existingEvents={allVendorEvents}
              onCreated={() => queryClient.invalidateQueries({ queryKey: ["vendorEvent", eventId] })}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showCollaborators} onOpenChange={setShowCollaborators}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collaborators</DialogTitle>
          </DialogHeader>
          <EventCollaboratorsPanel event={event} currentUser={currentUser} currentOrganizationIds={currentOrganizationIds} organizations={vendorAccounts} collaborators={collaborators} onRefresh={refresh} asPanel={false} />
        </DialogContent>
      </Dialog>

      <EventUpdatesManager event={event} updates={updates} onRefresh={refresh} canEdit={canUpdates} />

      {canFlags && event.event_type === "multi_spot" && <EventSpotManager event={event} spots={spots} onRefresh={refresh} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <CollapsiblePanel title="Invited Vendors" count={invitedVendors.length}>{invitedVendors.length ? invitedVendors.map((invite) => { const vendor = vendorById[invite.vendor_business_id]; return <div key={invite.id} className="flex items-center gap-3 rounded-xl border p-3 mb-2">{vendor?.business_logo && <img src={vendor.business_logo} alt={vendor.business_name} className="h-10 w-10 rounded-full object-cover" />}<div><p className="font-bold">{vendor?.business_name || "Vendor"}</p><p className="text-xs text-slate-500">Invited</p></div></div>; }) : <p className="text-sm text-slate-500">No invited vendors.</p>}</CollapsiblePanel>
        <CollapsiblePanel title="Pending Vendors" count={pendingRequests.length + pendingInvites.length} defaultOpen>{pendingInvites.map((invite) => { const vendor = vendorById[invite.vendor_business_id]; return <div key={invite.id} className="rounded-xl border p-3 mb-2"><p className="font-bold">{vendor?.business_name || "Vendor"}</p><p className="text-xs text-slate-500">{invite.status.replace("_", " ")}</p></div>; })}{pendingRequests.length ? pendingRequests.map((request) => <div key={request.id} className="rounded-xl border p-3 space-y-2 mb-2"><p className="font-bold">{request.business_name}</p><p className="text-sm text-slate-600">{request.request_message}</p>{canVendors && <div className="flex gap-2"><Button size="sm" disabled={isFull} onClick={() => approveRequest(request)}>Approve</Button><Button size="sm" variant="outline" onClick={() => denyRequest(request)}>Deny</Button></div>}</div>) : null}{!pendingRequests.length && !pendingInvites.length && <p className="text-sm text-slate-500">No pending vendors.</p>}</CollapsiblePanel>
        <CollapsiblePanel title="Approved Vendors" count={attendees.length}>{attendees.length ? attendees.map((vendor) => <div key={vendor.id} className="flex items-center gap-3 rounded-xl border p-3 mb-2">{vendor.logo && <img src={vendor.logo} alt={vendor.business_name} className="h-10 w-10 rounded-full object-cover" />}<span className="font-bold">{vendor.business_name}</span></div>) : <p className="text-sm text-slate-500">No approved vendors yet.</p>}</CollapsiblePanel>
      </div>

      <CollapsiblePanel title="History / Activity"><p className="text-sm text-slate-500">Event activity will appear here as vendors join and updates are made.</p></CollapsiblePanel>

      <InviteVendorsModal open={showInviteVendors} onOpenChange={setShowInviteVendors} event={event} organizerUserId={event.organizer_user_id} approvedCount={attendees.length} onInvited={refresh} />
    </div>
  );
}