import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { COLLABORATOR_ROLES, getRolePermissions } from "@/lib/eventCollaboration";
import { getVendorAccountNumber, getVendorAccountSearchText, isEligibleEventOrganizer } from "@/lib/vendorAccountIdentity";

const getVendorIdentityWarnings = (account) => {
  const warnings = [];
  if (!account?.owner_email) warnings.push("Missing Owner Email");
  if (!getVendorAccountNumber(account)) warnings.push("Missing Account Number");
  if (!account?.vendor_slug) warnings.push("Missing Vendor Slug");
  return warnings;
};
const vendorMatchesSearch = (account, query) => {
  const terms = String(query || "").toLowerCase().trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (!terms.length) return true;
  const text = getVendorAccountSearchText(account);
  return terms.every((term) => text.includes(term));
};
import { Search, Send } from "lucide-react";
import { toast } from "sonner";

export default function InviteOrganizationModal({ open, onOpenChange, event, currentUser, organizations, collaborators, onInvited }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("co_host");
  const [sendingId, setSendingId] = useState("");

  const existingOrganizationIds = new Set((collaborators || []).filter((item) => item.status !== "removed").map((item) => item.organization_id));

  const filteredOrganizations = useMemo(() => {
    return (organizations || [])
      .filter(isEligibleEventOrganizer)
      .filter((organization) => organization.id !== event?.organizer_business_id)
      .filter((organization) => !existingOrganizationIds.has(organization.id))
      .filter((organization) => vendorMatchesSearch(organization, query))
      .slice(0, 20);
  }, [organizations, event?.organizer_business_id, existingOrganizationIds, query]);

  const inviteOrganization = async (organization) => {
    setSendingId(organization.id);
    const now = new Date().toISOString();
    await base44.entities.EventCollaborator.create({
      event_id: event.id,
      organization_id: organization.id,
      organization_name: organization.business_name,
      role,
      permissions: getRolePermissions(role),
      invited_by_user_id: currentUser?.id,
      invited_at: now,
      status: "pending",
      is_primary_owner: false,
    });
    await base44.entities.Notification.create({
      userId: organization.owner_user_id,
      user_id: organization.owner_user_id,
      user_email: organization.owner_email || organization.email,
      title: "Event Collaboration Invitation",
      message: `${event.organizer_business_name || "An organizer"} invited ${organization.business_name} to collaborate on ${event.title}.`,
      type: "event_collaboration_invite",
      related_entity_type: "VendorEvent",
      related_entity_id: event.id,
      metadata: { event_id: event.id, organization_id: organization.id, role },
      read: false,
      is_read: false,
    });
    queryClient.invalidateQueries({ queryKey: ["eventCollaborators", event.id] });
    setSendingId("");
    toast.success("Organization invited");
    onInvited?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Invite Organization</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search business, owner, email, account #, phone, city, state, ZIP" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(COLLABORATOR_ROLES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            {filteredOrganizations.map((organization) => (
              <div key={organization.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={organization.business_logo || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=120&h=120&fit=crop"} alt={organization.business_name} className="h-12 w-12 rounded-full object-cover" />
                  <div className="min-w-0 space-y-1">
                    <p className="font-bold text-[#2C4F4E] truncate">{organization.business_name}</p>
                    <p className="text-sm text-slate-600 truncate">{organization.business_city || organization.location || "Location not listed"}{organization.business_state ? `, ${organization.business_state}` : ""}</p>
                    <p className="text-xs text-slate-500 truncate">Vendor Account #: {getVendorAccountNumber(organization) || "Not assigned"}</p>
                    <p className="text-xs text-slate-500 truncate">Owner: {organization.owner_name || "Not listed"}</p>
                    <p className="text-xs text-slate-500 truncate">Owner Email: {organization.owner_email || "Not listed"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getVendorIdentityWarnings(organization).map((warning) => <Badge key={warning} className="bg-amber-100 text-amber-800 hover:bg-amber-100">{warning}</Badge>)}
                  <Badge variant="outline">{COLLABORATOR_ROLES[role]}</Badge>
                  <Button disabled={sendingId === organization.id} onClick={() => inviteOrganization(organization)} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"><Send className="h-4 w-4" /> Invite</Button>
                </div>
              </div>
            ))}
            {!filteredOrganizations.length && <div className="rounded-2xl border p-6 text-center text-slate-500">No available organizations found.</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}