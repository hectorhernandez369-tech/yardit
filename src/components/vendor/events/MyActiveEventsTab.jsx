import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CalendarPlus } from "lucide-react";
import VendorEventCard from "./VendorEventCard";
import { getVendorEventStatus } from "@/lib/vendorEvents";
import { canEditEvent, canManageCollaborators, canManageFlags, canManageSchedule, canManageVendors, getHostedByLabels } from "@/lib/eventCollaboration";

export default function MyActiveEventsTab({
  events, attendees, collaborators, vendorAccounts, account,
  canCreateAnyEvent, onCreateEvent, onEditEvent, onCollaborators,
  navigate, pendingCollaborationInvites, onReviewInvite,
}) {
  const now = new Date();
  const currentOrganizationIds = account?.id ? [account.id] : [];
  const organizationById = Object.fromEntries(vendorAccounts.map((a) => [a.id, a]));

  const myEvents = events
    .map((e) => ({
      ...e,
      computedStatus: getVendorEventStatus(e, now),
      approvedVendorCount: attendees.filter((a) => a.event_id === e.id).length,
    }))
    .filter((e) => !["completed", "cancelled"].includes(e.computedStatus))
    .filter((e) => {
      const isOwner = e.organizer_business_id === account?.id;
      const isCollab = collaborators.some((c) => c.event_id === e.id && c.organization_id === account?.id && c.status === "accepted");
      return isOwner || isCollab;
    });

  const hosted = myEvents.filter((e) => e.organizer_business_id === account?.id);
  const participating = myEvents.filter((e) => e.organizer_business_id !== account?.id);

  return (
    <div className="space-y-5">
      {/* Pending invites */}
      {pendingCollaborationInvites.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 rounded-2xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400 text-amber-900 text-[10px]">{pendingCollaborationInvites.length}</Badge>
              <h4 className="font-bold text-amber-900 text-sm">Pending Collaboration Invites</h4>
            </div>
            <div className="space-y-2">
              {pendingCollaborationInvites.map((invite) => {
                const evt = events.find((e) => e.id === invite.event_id);
                return (
                  <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-white border border-amber-200 p-3">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{evt?.title || "Event invite"}</p>
                      <p className="text-xs text-slate-500">From: {evt?.organizer_business_name || "Event owner"}</p>
                    </div>
                    <Button size="sm" onClick={() => onReviewInvite(invite)}>Review Invite</Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hosted events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-bold text-slate-800">My Hosted Events</h4>
            <p className="text-xs text-slate-500">Events you created and manage</p>
          </div>
          {canCreateAnyEvent && (
            <Button size="sm" onClick={onCreateEvent} className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a] gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" /> New Event
            </Button>
          )}
        </div>
        {hosted.length === 0 ? (
          <EmptySection
            message="You haven't hosted any events yet."
            action={canCreateAnyEvent ? <Button size="sm" onClick={onCreateEvent} className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]"><CalendarPlus className="h-4 w-4 mr-1" /> Create Event</Button> : null}
          />
        ) : (
          <div className="space-y-3">
            {hosted.map((event) => (
              <VendorEventCard
                key={event.id}
                event={event}
                approvedVendorCount={event.approvedVendorCount}
                hostedLabels={getHostedByLabels(event, collaborators, vendorAccounts)}
                isCollaborating={false}
                ownerName={organizationById[event.organizer_business_id]?.business_name || event.organizer_business_name}
                canEdit={canEditEvent(event, collaborators, currentOrganizationIds)}
                canManageVendors={canManageVendors(event, collaborators, currentOrganizationIds)}
                canManageFlags={canManageFlags(event, collaborators, currentOrganizationIds)}
                canManageSchedule={canManageSchedule(event, collaborators, currentOrganizationIds)}
                canManageCollaborators={canManageCollaborators(event, collaborators, currentOrganizationIds)}
                onEdit={() => onEditEvent(event)}
                onManage={() => navigate(`/VendorEventDashboard?id=${event.id}`)}
                onEditFlags={() => navigate(`/VendorEventFlags?id=${event.id}`)}
                onSchedule={() => navigate(`/VendorEventSchedule?id=${event.id}`)}
                onCollaborators={() => onCollaborators(event)}
                onView={() => navigate(`/VendorEventPublicPage?id=${event.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Participating events */}
      {(participating.length > 0) && (
        <div>
          <div className="mb-3">
            <h4 className="font-bold text-slate-800">Events I'm Participating In</h4>
            <p className="text-xs text-slate-500">Events where you're a collaborator or attendee</p>
          </div>
          <div className="space-y-3">
            {participating.map((event) => (
              <VendorEventCard
                key={event.id}
                event={event}
                approvedVendorCount={event.approvedVendorCount}
                hostedLabels={getHostedByLabels(event, collaborators, vendorAccounts)}
                isCollaborating={true}
                ownerName={organizationById[event.organizer_business_id]?.business_name || event.organizer_business_name}
                canEdit={canEditEvent(event, collaborators, currentOrganizationIds)}
                canManageVendors={canManageVendors(event, collaborators, currentOrganizationIds)}
                canManageFlags={canManageFlags(event, collaborators, currentOrganizationIds)}
                canManageSchedule={canManageSchedule(event, collaborators, currentOrganizationIds)}
                canManageCollaborators={canManageCollaborators(event, collaborators, currentOrganizationIds)}
                onEdit={() => onEditEvent(event)}
                onManage={() => navigate(`/VendorEventDashboard?id=${event.id}`)}
                onEditFlags={() => navigate(`/VendorEventFlags?id=${event.id}`)}
                onSchedule={() => navigate(`/VendorEventSchedule?id=${event.id}`)}
                onCollaborators={() => onCollaborators(event)}
                onView={() => navigate(`/VendorEventPublicPage?id=${event.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptySection({ message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-3">
      <CalendarDays className="h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}