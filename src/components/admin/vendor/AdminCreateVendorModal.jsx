import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { buildVendorAccountIdentityFields } from "@/lib/vendorAccountIdentity";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminCreateVendorModal({ open, onClose, adminUser, onCreated }) {
  const [form, setForm] = useState({
    owner_email: "",
    business_name: "",
    organization_type: "vendor",
    business_category: "",
    vendor_tier: "free",
  });
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.owner_email.trim() || !form.business_name.trim()) {
      toast.error("Owner email and business name are required.");
      return;
    }
    setSaving(true);
    const [existingAccounts, existingReservations] = await Promise.all([
      base44.entities.VendorAccount.list(),
      base44.entities.VendorAccountIdentityReservation.list(),
    ]);
    const fakeUser = { id: form.owner_email.trim(), email: form.owner_email.trim() };
    const identityFields = buildVendorAccountIdentityFields(fakeUser, existingAccounts, existingReservations, form.business_name.trim());
    const now = new Date().toISOString();

    const [reservationNum, reservationSlug] = await Promise.all([
      base44.entities.VendorAccountIdentityReservation.create({
        type: "vendor_account_number",
        value: identityFields.vendor_account_number,
        vendor_account_id: "pending",
        vendor_account_number: identityFields.vendor_account_number,
        vendor_slug: identityFields.vendor_slug,
        business_name_at_assignment: form.business_name.trim(),
        owner_user_id: form.owner_email.trim(),
        owner_email: form.owner_email.trim(),
        status: "reserved",
        reserved_at: now,
      }),
      base44.entities.VendorAccountIdentityReservation.create({
        type: "vendor_slug",
        value: identityFields.vendor_slug,
        vendor_account_id: "pending",
        vendor_account_number: identityFields.vendor_account_number,
        vendor_slug: identityFields.vendor_slug,
        business_name_at_assignment: form.business_name.trim(),
        owner_user_id: form.owner_email.trim(),
        owner_email: form.owner_email.trim(),
        status: "reserved",
        reserved_at: now,
      }),
    ]);

    const account = await base44.entities.VendorAccount.create({
      business_name: form.business_name.trim(),
      organization_type: form.organization_type,
      business_category: form.business_category.trim(),
      owner_email: form.owner_email.trim(),
      owner_user_id: form.owner_email.trim(),
      owner_name: form.owner_email.trim(),
      ...identityFields,
      vendor_tier: form.vendor_tier,
      subscription_status: "active",
      vendor_setup_status: "setup_required",
      extra_users_count: 0,
      extra_pins_count: 0,
      current_authorized_users: 1,
      current_vendor_pins: 0,
      is_active: true,
      vendor_origin: "admin_auto_created",
    });

    await Promise.all([
      base44.entities.VendorAccountIdentityReservation.update(reservationNum.id, { vendor_account_id: account.id, status: "assigned" }),
      base44.entities.VendorAccountIdentityReservation.update(reservationSlug.id, { vendor_account_id: account.id, status: "assigned" }),
    ]);

    await base44.entities.AdminAuditLog.create({
      user_id: adminUser?.id,
      admin_employee_id: adminUser?.employee_id || adminUser?.email || adminUser?.id || "unknown",
      action_type: "admin_created_vendor_account",
      target_type: "VendorAccount",
      target_id: account.id,
      success: true,
      metadata: JSON.stringify({
        vendor_account_id: account.id,
        vendor_account_number: account.vendor_account_number,
        vendor_slug: account.vendor_slug,
        business_name: account.business_name,
        business_category: account.business_category || null,
        owner_email: account.owner_email,
        vendor_tier: account.vendor_tier,
        subscription_status: account.subscription_status,
        created_by_admin_email: adminUser?.email || null,
        created_at: now,
      }),
    });

    toast.success(`Vendor account created for ${form.owner_email.trim()}`);
    setSaving(false);
    setForm({ owner_email: "", business_name: "", organization_type: "vendor", business_category: "", vendor_tier: "free" });
    onCreated?.(account);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create Vendor Account</DialogTitle>
          <p className="text-sm text-slate-500 mt-0.5">Create a vendor account on behalf of a user. The account will be linked to their email so they can claim it when they sign up.</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Intended Owner Email *</Label>
            <Input
              type="email"
              placeholder="owner@example.com"
              value={form.owner_email}
              onChange={(e) => update("owner_email", e.target.value)}
            />
            <p className="text-xs text-slate-500">The account will be linked to this email. When the user signs up with this email, they'll see it and can claim it.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Business Name *</Label>
            <Input
              placeholder="Business name"
              value={form.business_name}
              onChange={(e) => update("business_name", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <Select value={form.organization_type} onValueChange={(value) => update("organization_type", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="league_team">League / Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Business Category</Label>
            <Input
              placeholder="e.g. Food Truck, Craft Vendor..."
              value={form.business_category}
              onChange={(e) => update("business_category", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Starting Tier</Label>
            <Select value={form.vendor_tier} onValueChange={(v) => update("vendor_tier", v)}>
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

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="flex-1 bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Create Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}