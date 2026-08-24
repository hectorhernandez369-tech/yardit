import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { sendYarditNotification } from "@/lib/yarditNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { COLLABORATOR_ROLES, PERMISSION_LABELS, getRolePermissions } from "@/lib/eventCollaboration";
import { toast } from "sonner";

export default function CollaborationInviteReview({ invite, event, receivingOrganization, invitingOrganization, onRespond }) {
  const [saving, setSaving] = useState(false);
  const permissions = useMemo(() => ({ ...getRolePermissions(invite?.role), ...(invite?.permissions || {}) }), [invite]);
  const assignedPermissions = Object.entries(PERMISSION_LABELS).filter(([key]) => permissions[key] === true);

  const respond = async (status) => {
    setSaving(true);
    const now = new Date().toISOString();
    const updateData = status === "accepted"
      ? { status, accepted_at: now, responded_at: now }
      : { status, declined_at: now, responded_at: now };

    await base44.entities.EventCollaborator.update(invite.id, updateData);
    await sendYarditNotification({
      userId: event.organizer_user_id,
      user_id: event.organizer_user_id,
      user_email: invitingOrganization?.owner_email || invitingOrganization?.email,
      title: status === "accepted" ? "Collaboration Invite Accepted" : "Collaboration Invite Declined",
      message: `${receivingOrganization?.business_name || invite.organization_name || "An organization"} ${status === "accepted" ? "accepted" : "declined"} the collaboration invite for ${event.title}.`,
      type: status === "accepted" ? "event_collaboration_accepted" : "event_collaboration_declined",
      related_entity_type: "VendorEvent",
      related_entity_id: event.id,
      metadata: { event_id: event.id, collaborator_id: invite.id, organization_id: invite.organization_id },
      read: false,
      is_read: false,
    });
    toast.success(status === "accepted" ? "Collaboration invite accepted" : "Collaboration invite declined");
    setSaving(false);
    onRespond?.();
  };

  if (!invite || !event) return null;

  return (
    <Card className="rounded-3xl bg-white">
      <CardContent className="p-5 space-y-4">
        <div>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Collaboration Invite</Badge>
          <h3 className="mt-2 text-2xl font-black text-[#2C4F4E]">{event.title}</h3>
          <p className="text-sm text-slate-600">Review the assigned collaboration access before responding.</p>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p><strong>Inviting organization:</strong> {invitingOrganization?.business_name || event.organizer_business_name || "Event owner"}</p>
          <p><strong>Receiving organization:</strong> {receivingOrganization?.business_name || invite.organization_name || "Your organization"}</p>
          <p><strong>Assigned role:</strong> {COLLABORATOR_ROLES[invite.role] || invite.role}</p>
          <p><strong>Status:</strong> <span className="capitalize">{invite.status}</span></p>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-[#2C4F4E]">Assigned permissions</p>
          <div className="flex flex-wrap gap-2">
            {assignedPermissions.length ? assignedPermissions.map(([key, label]) => <Badge key={key} variant="outline">{label}</Badge>) : <Badge variant="outline">View only</Badge>}
          </div>
        </div>

        {(invite.invitation_note || invite.note || invite.message) && (
          <div className="rounded-2xl border bg-[#FBFAF7] p-3 text-sm text-slate-700">
            <strong>Message:</strong> {invite.invitation_note || invite.note || invite.message}
          </div>
        )}

        {invite.status === "pending" ? (
          <div className="flex flex-wrap gap-2 justify-end">
            <Button disabled={saving} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => respond("declined")}><X className="h-4 w-4" /> Decline</Button>
            <Button disabled={saving} className="bg-green-600 hover:bg-green-700" onClick={() => respond("accepted")}><Check className="h-4 w-4" /> Accept</Button>
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold capitalize text-slate-700">This invite has been {invite.status}.</p>
        )}
      </CardContent>
    </Card>
  );
}