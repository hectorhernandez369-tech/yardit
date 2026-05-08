import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateMiles } from "@/lib/vendorEvents";
import { ChevronDown, Mail, Search } from "lucide-react";
import { toast } from "sonner";

export default function InviteVendorsModal({ open, onOpenChange, event, organizerUserId, approvedCount = 0, onInvited }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [radius, setRadius] = useState("100");
  const [city, setCity] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);

  const { data: vendors = [] } = useQuery({ queryKey: ["inviteVendorAccounts"], queryFn: () => base44.entities.VendorAccount.list(), initialData: [] });
  const { data: invites = [] } = useQuery({ queryKey: ["eventVendorInvites", event?.id], queryFn: () => base44.entities.EventVendorInvite.filter({ event_id: event.id }), enabled: !!event?.id, initialData: [] });

  const invitedBusinessIds = new Set(invites.filter((invite) => invite.status !== "declined").map((invite) => invite.vendor_business_id));
  const isFull = event?.max_vendors && approvedCount >= Number(event.max_vendors);

  const categories = useMemo(() => [...new Set(vendors.map((vendor) => vendor.business_category).filter(Boolean))].sort(), [vendors]);

  const filteredVendors = useMemo(() => {
    const text = query.toLowerCase();
    return vendors
      .filter((vendor) => vendor.id !== event?.organizer_business_id)
      .map((vendor) => ({
        ...vendor,
        distanceMiles: vendor.latitude && vendor.longitude && event?.latitude && event?.longitude
          ? calculateMiles(event.latitude, event.longitude, vendor.latitude, vendor.longitude)
          : null,
      }))
      .filter((vendor) => radius === "any" || (vendor.distanceMiles !== null && vendor.distanceMiles <= Number(radius)))
      .filter((vendor) => !onlyActive || vendor.is_active !== false)
      .filter((vendor) => !onlyVerified || vendor.is_verified_vendor === true)
      .filter((vendor) => category === "all" || vendor.business_category === category)
      .filter((vendor) => !city || (vendor.business_city || vendor.location || "").toLowerCase().includes(city.toLowerCase()))
      .filter((vendor) => !text || [vendor.business_name, vendor.owner_name, vendor.phone, vendor.email, vendor.account_number, vendor.business_category, vendor.business_city, vendor.location].join(" ").toLowerCase().includes(text))
      .sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
  }, [vendors, event, query, radius, onlyActive, onlyVerified, category, city]);

  const toggleVendor = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const sendInvitations = async () => {
    const selectedVendors = filteredVendors.filter((vendor) => selectedIds.includes(vendor.id) && !invitedBusinessIds.has(vendor.id));
    if (!selectedVendors.length) {
      toast.error("Select at least one new vendor to invite.");
      return;
    }

    setSending(true);
    const now = new Date().toISOString();
    await Promise.all(selectedVendors.map(async (vendor) => {
      const invite = await base44.entities.EventVendorInvite.create({
        event_id: event.id,
        organizer_user_id: organizerUserId,
        vendor_user_id: vendor.owner_user_id,
        vendor_business_id: vendor.id,
        status: "invited",
        created_at: now,
        updated_at: now,
      });

      await base44.entities.Notification.create({
        userId: vendor.owner_user_id,
        user_id: vendor.owner_user_id,
        user_email: vendor.email,
        title: "Vendor Event Invitation",
        message: `${event.organizer_business_name || event.title} invited you to join ${event.title}.`,
        type: "vendor_event_invite",
        related_entity_type: "VendorEvent",
        related_entity_id: event.id,
        metadata: { invite_id: invite.id, event_id: event.id, vendor_business_id: vendor.id },
        read: false,
        is_read: false,
      });
    }));

    setSending(false);
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ["eventVendorInvites", event.id] });
    onInvited?.();
    toast.success("Invitations sent");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Invite Vendors</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {isFull && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-semibold text-red-700">This event is full. New invitations are disabled.</div>}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search by business, owner, phone, email, account, category, or city" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <Button type="button" variant="outline" onClick={() => setFiltersOpen(!filtersOpen)} className="w-full justify-between">
            Filters <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </Button>

          {filtersOpen && (
            <div className="grid gap-3 rounded-2xl bg-[#FBFAF7] p-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1"><Label>Category/type</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Distance radius</Label><Select value={radius} onValueChange={setRadius}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25 miles</SelectItem><SelectItem value="50">50 miles</SelectItem><SelectItem value="100">100 miles</SelectItem><SelectItem value="any">Any distance</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City/location" /></div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Only active vendors</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} /> Only verified vendors</label>
            </div>
          )}

          <div className="grid gap-3">
            {filteredVendors.map((vendor) => {
              const alreadyInvited = invitedBusinessIds.has(vendor.id);
              return (
                <label key={vendor.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${alreadyInvited ? "bg-slate-50 opacity-70" : "bg-white"}`}>
                  <input type="checkbox" checked={selectedIds.includes(vendor.id)} disabled={alreadyInvited || isFull} onChange={() => toggleVendor(vendor.id)} />
                  <img src={vendor.business_logo || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=120&h=120&fit=crop"} alt={vendor.business_name} className="h-12 w-12 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#2C4F4E]">{vendor.business_name}</p>{alreadyInvited && <span className="text-xs rounded-full bg-slate-200 px-2 py-0.5">Already invited</span>}</div>
                    <p className="text-sm text-slate-600">{vendor.owner_name || "Owner not listed"} · {vendor.business_city || vendor.location || "City not listed"} · {vendor.business_category || "Vendor"}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">{vendor.distanceMiles !== null ? `${vendor.distanceMiles.toFixed(1)} mi` : "Distance N/A"}</p>
                </label>
              );
            })}
            {!filteredVendors.length && <div className="rounded-2xl border p-6 text-center text-slate-500">No vendors found.</div>}
          </div>

          <div className="flex justify-end">
            <Button disabled={sending || isFull} onClick={sendInvitations} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"><Mail className="h-4 w-4" /> Send Invitations</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}