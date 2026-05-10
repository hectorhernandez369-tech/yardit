import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CollapsiblePanel from "./CollapsiblePanel";
import InviteOrganizationModal from "./InviteOrganizationModal";
import { COLLABORATOR_ROLES, canManageCollaborators, getRolePermissions, getHostedByLabels } from "@/lib/eventCollaboration";
import { Building2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function EventCollaboratorsPanel({ event, currentUser, currentOrganizationIds, organizations, collaborators, inviteOpen, onInviteOpenChange, onRefresh, asPanel = true }) {
  const [localShowInvite, setLocalShowInvite] = useState(false);
  const showInvite = inviteOpen ?? localShowInvite;
  const setShowInvite = onInviteOpenChange || setLocalShowInvite;
  const canManage = canManageCollaborators(event, collaborators, currentOrganizationIds);
  const eventCollaborators = useMemo(() => (collaborators || []).filter((item) => item.event_id === event.id && item.status !== "removed"), [collaborators, event.id]);
  const labels = getHostedByLabels(event, eventCollaborators, organizations);

  const updateCollaborator = async (collaborator, data) => {
    await base44.entities.EventCollaborator.update(collaborator.id, { ...data, permissions: data.role ? getRolePermissions(data.role) : collaborator.permissions });
    toast.success("Collaborator updated");
    onRefresh?.();
  };

  const acceptInvite = async (collaborator) => {
    await updateCollaborator(collaborator, { status: "accepted", accepted_at: new Date().toISOString() });
  };

  const transferOwnership = async (collaborator) => {
    if (collaborator.status !== "accepted") return toast.error("Only accepted collaborators can become primary owner.");
    const organization = organizations.find((item) => item.id === collaborator.organization_id);
    await Promise.all(eventCollaborators.map((item) => base44.entities.EventCollaborator.update(item.id, { is_primary_owner: item.id === collaborator.id })));
    await base44.entities.VendorEvent.update(event.id, {
      organizer_business_id: collaborator.organization_id,
      organizer_business_name: organization?.business_name || collaborator.organization_name,
      organizer_logo: organization?.business_logo || event.organizer_logo,
    });
    toast.success("Primary ownership transferred");
    onRefresh?.();
  };

  const removeCollaborator = async (collaborator) => {
    if (collaborator.is_primary_owner) return toast.error("The primary owner cannot be removed.");
    await updateCollaborator(collaborator, { status: "removed" });
  };

  const content = (
    <div className="space-y-4">
        <div className="rounded-2xl border bg-[#FBFAF7] p-3 text-sm text-slate-700">
          <p><strong>Hosted By:</strong> {labels.hostedBy}</p>
          <p><strong>Co-Hosted By:</strong> {labels.coHostedBy.length ? labels.coHostedBy.join(", ") : "None yet"}</p>
        </div>

        {canManage && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowInvite(true)}><UserPlus className="h-4 w-4" /> Invite Organization</Button>
          </div>
        )}

        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-2xl border bg-white p-3">
            <div className="flex items-center gap-3 min-w-0">
              <Building2 className="h-5 w-5 text-[#5DADA5]" />
              <div className="min-w-0">
                <p className="font-bold text-[#2C4F4E] truncate">{labels.hostedBy}</p>
                <p className="text-xs text-slate-500">Primary owner</p>
              </div>
            </div>
            <Badge className="bg-[#5DADA5] text-white">Owner</Badge>
          </div>

          {eventCollaborators.map((collaborator) => {
            const organization = organizations.find((item) => item.id === collaborator.organization_id);
            const belongsToCurrentOrg = currentOrganizationIds.includes(collaborator.organization_id);
            return (
              <div key={collaborator.id} className="rounded-2xl border bg-white p-3 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={organization?.business_logo || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=120&h=120&fit=crop"} alt={organization?.business_name || collaborator.organization_name || "Organization"} className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="font-bold text-[#2C4F4E] truncate">{organization?.business_name || collaborator.organization_name || "Organization"}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1"><Badge variant="outline">{COLLABORATOR_ROLES[collaborator.role] || collaborator.role}</Badge><Badge className="capitalize">{collaborator.status}</Badge></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canManage && collaborator.status !== "accepted" && <Button size="sm" variant="outline" onClick={() => acceptInvite(collaborator)}>Mark Accepted</Button>}
                    {belongsToCurrentOrg && collaborator.status === "pending" && <Button size="sm" onClick={() => acceptInvite(collaborator)}>Accept</Button>}
                    {canManage && <Select value={collaborator.role} onValueChange={(role) => updateCollaborator(collaborator, { role })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COLLABORATOR_ROLES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>}
                    {canManage && collaborator.status === "accepted" && !collaborator.is_primary_owner && <Button size="sm" variant="outline" onClick={() => transferOwnership(collaborator)}>Make Primary Owner</Button>}
                    {canManage && <Button size="sm" variant="outline" onClick={() => removeCollaborator(collaborator)}>Remove</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <InviteOrganizationModal open={showInvite} onOpenChange={setShowInvite} event={event} currentUser={currentUser} organizations={organizations} collaborators={eventCollaborators} onInvited={() => { setShowInvite(false); onRefresh?.(); }} />
    </div>
  );

  if (!asPanel) return content;

  return (
    <CollapsiblePanel title="Collaborators" description="Attach other Event Organizer organizations to this single master event." count={eventCollaborators.length} defaultOpen>
      {content}
    </CollapsiblePanel>
  );
}