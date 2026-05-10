import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { COLLABORATOR_ROLES } from "@/lib/eventCollaboration";
import { Search, Trash2, UserPlus } from "lucide-react";

const CREATION_ROLES = ["co_host", "scheduler", "vendor_manager", "staff", "viewer"];

export default function CreateEventCollaboratorsSection({ account, invitations, onChange }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("co_host");

  const { data: organizations = [] } = useQuery({
    queryKey: ["createEventCollaboratorOrganizations"],
    queryFn: () => base44.entities.VendorAccount.list(),
    initialData: [],
  });

  const invitedIds = useMemo(() => new Set(invitations.map((invite) => invite.organization_id)), [invitations]);

  const searchResults = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];

    return organizations
      .filter((organization) => organization.id !== account?.id)
      .filter((organization) => !invitedIds.has(organization.id))
      .filter((organization) => [
        organization.business_name,
        organization.owner_name,
        organization.business_category,
        organization.business_city,
        organization.location,
      ].join(" ").toLowerCase().includes(text))
      .slice(0, 8);
  }, [organizations, account?.id, invitedIds, query]);

  const addInvitation = (organization) => {
    onChange([
      ...invitations,
      {
        organization_id: organization.id,
        organization_name: organization.business_name,
        organization_owner_user_id: organization.owner_user_id,
        organization_email: organization.email,
        role,
      },
    ]);
    setQuery("");
  };

  const removeInvitation = (organizationId) => {
    onChange(invitations.filter((invite) => invite.organization_id !== organizationId));
  };

  return (
    <div className="rounded-2xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-4 space-y-4">
      <div>
        <h3 className="font-black text-[#2C4F4E]">Collaborating Organizations</h3>
        <p className="text-xs text-slate-500">Optional setup. Invited organizations stay pending until they accept, and your organization remains the primary owner.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search Event Organizer organizations by name" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CREATION_ROLES.map((value) => <SelectItem key={value} value={value}>{COLLABORATOR_ROLES[value]}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {searchResults.length > 0 && (
        <div className="grid gap-2">
          {searchResults.map((organization) => (
            <div key={organization.id} className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold text-[#2C4F4E] truncate">{organization.business_name}</p>
                <p className="text-xs text-slate-500 truncate">{organization.business_category || "Event Organizer"} · {organization.business_city || organization.location || "Location not listed"}</p>
              </div>
              <Button type="button" size="sm" onClick={() => addInvitation(organization)} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">
                <UserPlus className="h-4 w-4" /> Invite Organization
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {invitations.map((invite) => (
          <div key={invite.organization_id} className="flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-[#2C4F4E]">{invite.organization_name}</span>
              <span className="text-slate-400">—</span>
              <Badge variant="outline">{COLLABORATOR_ROLES[invite.role]}</Badge>
              <span className="text-slate-400">—</span>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => removeInvitation(invite.organization_id)}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        ))}
        {!invitations.length && <p className="text-xs text-slate-500">No collaborating organizations invited yet.</p>}
      </div>
    </div>
  );
}