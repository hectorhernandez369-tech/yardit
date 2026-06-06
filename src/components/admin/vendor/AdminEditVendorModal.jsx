import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

export default function AdminEditVendorModal({ open, onClose, account, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (account) setForm({ ...account });
  }, [account]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("business_logo", file_url);
    setUploadingLogo(false);
    toast.success("Logo uploaded. Click Save Changes to publish it.");
    event.target.value = "";
  };

  const handleSave = async () => {
    if (!form.business_name?.trim() || !form.owner_email?.trim()) {
      toast.error("Business name and owner email are required.");
      return;
    }

    setSaving(true);
    const businessAddress = [
      form.business_street_address,
      form.business_city,
      form.business_state,
      form.business_zip_code,
    ].filter(Boolean).join(", ");

    const payload = {
      business_name: form.business_name.trim(),
      vendor_display_name: form.vendor_display_name || form.business_name.trim(),
      legal_business_name: form.legal_business_name || form.business_name.trim(),
      business_category: form.business_category,
      business_logo: form.business_logo,
      owner_name: form.owner_name,
      owner_email: form.owner_email.trim(),
      owner_user_id: account?.owner_user_id === account?.owner_email ? form.owner_email.trim() : account?.owner_user_id,
      phone: form.phone,
      business_phone: form.phone,
      email: form.email,
      website: form.website,
      description: form.description,
      business_street_address: form.business_street_address,
      business_city: form.business_city,
      business_state: form.business_state,
      business_zip_code: form.business_zip_code,
      business_address: businessAddress,
      location: businessAddress || form.location,
      vendor_tier: form.vendor_tier || "free",
      subscription_status: form.subscription_status || "active",
      vendor_setup_status: form.vendor_setup_status || "setup_required",
      is_active: form.is_active !== false,
    };

    await base44.entities.VendorAccount.update(account.id, payload);
    toast.success("Vendor account updated");
    setSaving(false);
    await onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Vendor Account</DialogTitle>
          <p className="text-sm text-slate-500">Update the vendor account details shown in Admin and on the public vendor page.</p>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border bg-slate-50 p-3 sm:col-span-2 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white">
              {form.business_logo ? (
                <img src={form.business_logo} alt="Business logo" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Label>Business Logo</Label>
              <p className="text-xs text-slate-500">Upload a logo for this vendor account.</p>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Business Name *</Label>
            <Input value={form.business_name || ""} onChange={(e) => update("business_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Public Display Name</Label>
            <Input value={form.vendor_display_name || ""} onChange={(e) => update("vendor_display_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Legal Business Name</Label>
            <Input value={form.legal_business_name || ""} onChange={(e) => update("legal_business_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Business Category</Label>
            <Input value={form.business_category || ""} onChange={(e) => update("business_category", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Owner Name</Label>
            <Input value={form.owner_name || ""} onChange={(e) => update("owner_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Owner Email *</Label>
            <Input type="email" value={form.owner_email || ""} onChange={(e) => update("owner_email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Public Phone</Label>
            <Input value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Public Email</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Website</Label>
            <Input value={form.website || ""} onChange={(e) => update("website", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Street Address</Label>
            <Input value={form.business_street_address || ""} onChange={(e) => update("business_street_address", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={form.business_city || ""} onChange={(e) => update("business_city", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.business_state || ""} onChange={(e) => update("business_state", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={form.business_zip_code || ""} onChange={(e) => update("business_zip_code", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Vendor Tier</Label>
            <Select value={form.vendor_tier || "free"} onValueChange={(value) => update("vendor_tier", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="event_organizer">Event Organizer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subscription Status</Label>
            <Select value={form.subscription_status || "active"} onValueChange={(value) => update("subscription_status", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Setup Status</Label>
            <Select value={form.vendor_setup_status || "setup_required"} onValueChange={(value) => update("vendor_setup_status", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="setup_required">Setup Required</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Account Status</Label>
            <Select value={form.is_active === false ? "inactive" : "active"} onValueChange={(value) => update("is_active", value === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} className="min-h-28" />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}