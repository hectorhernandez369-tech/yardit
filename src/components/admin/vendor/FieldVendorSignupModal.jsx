import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { buildVendorAccountIdentityFields } from "@/lib/vendorAccountIdentity";
import { toast } from "sonner";
import { Loader2, MapPin, Store, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEFAULT_CATEGORY = "Event Vendor";
<<<<<<< HEAD
const PROMO_TYPES = [
  { value: "none", label: "No Promo" },
  { value: "tier_comp", label: "Free Tier Trial" },
  { value: "percentage_discount", label: "Percentage Discount" },
  { value: "free_checkins", label: "Free Check-ins" },
  { value: "bonus_pins", label: "Bonus Pins" },
  { value: "free_events", label: "Free Events" },
];
const PROMO_PERIODS = [7, 14, 30, 60, 90];

function promoDefaults(type) {
  if (type === "tier_comp") return { promo_value: null, promo_tier: "pro", granted_count: 0 };
  if (type === "percentage_discount") return { promo_value: 50, promo_tier: null, granted_count: 0 };
  if (type === "free_checkins") return { promo_value: 5, promo_tier: null, granted_count: 5 };
  if (type === "bonus_pins") return { promo_value: 1, promo_tier: null, granted_count: 1 };
  if (type === "free_events") return { promo_value: 1, promo_tier: null, granted_count: 1 };
  return { promo_value: null, promo_tier: null, granted_count: 0 };
}

async function createSignupPromo({ account, promoType, promoDays, adminUser }) {
  if (!account?.id || !promoType || promoType === "none") return null;
  const now = new Date();
  const end = new Date(now.getTime() + Number(promoDays || 30) * 24 * 60 * 60 * 1000);
  const defaults = promoDefaults(promoType);
  const description = promoType === "tier_comp"
    ? `Free ${defaults.promo_tier} tier trial for ${promoDays} days`
    : `${PROMO_TYPES.find((item) => item.value === promoType)?.label || "Promo"} for ${promoDays} days`;

  return base44.entities.VendorPromotion.create({
    vendor_account_id: account.id,
    vendor_account_number: account.vendor_account_number || "",
    business_name: account.business_name || "",
    owner_user_id: account.owner_user_id || "",
    promo_type: promoType,
    promo_value: defaults.promo_value,
    promo_tier: defaults.promo_tier,
    event_type_limit: promoType === "free_events" ? "any" : null,
    promo_description: description,
    duration_type: "days",
    duration_value: Number(promoDays || 30),
    start_date: now.toISOString(),
    end_date: end.toISOString(),
    status: "active",
    granted_count: defaults.granted_count,
    used_count: 0,
    reason_note: "Granted during assisted field vendor signup",
    created_by_admin_id: adminUser?.id || "",
    created_by_admin_name: adminUser?.full_name || adminUser?.email || "",
  });
}

export default function FieldVendorSignupModal({ open, onClose, adminUser, onCreated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    owner_email: "",
    business_name: "",
    business_category: DEFAULT_CATEGORY,
    phone: "",
    promo_type: "tier_comp",
    promo_days: "30",
  });
=======

export default function FieldVendorSignupModal({ open, onClose, adminUser, onCreated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ owner_email: "", business_name: "", business_category: DEFAULT_CATEGORY, phone: "" });
>>>>>>> origin/main
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetAndClose = () => {
<<<<<<< HEAD
    setForm({ owner_email: "", business_name: "", business_category: DEFAULT_CATEGORY, phone: "", promo_type: "tier_comp", promo_days: "30" });
=======
    setForm({ owner_email: "", business_name: "", business_category: DEFAULT_CATEGORY, phone: "" });
>>>>>>> origin/main
    setCreated(null);
    setSaving(false);
    onClose?.();
  };

  const createFieldVendor = async () => {
    const ownerEmail = form.owner_email.trim().toLowerCase();
    const businessName = form.business_name.trim();
    if (!ownerEmail || !businessName) {
      toast.error("Business name and vendor email are required.");
      return;
    }

    setSaving(true);
    try {
      const [existingAccounts, existingReservations] = await Promise.all([
        base44.entities.VendorAccount.list(),
        base44.entities.VendorAccountIdentityReservation.list(),
      ]);

      const existingForEmail = existingAccounts.find((account) =>
        String(account.owner_email || "").toLowerCase() === ownerEmail && account.is_active !== false
      );

      if (existingForEmail) {
        setCreated(existingForEmail);
        toast.info("That email already has a Yardit organization account. Opening the existing account instead.");
        setSaving(false);
        return;
      }

      const identityFields = buildVendorAccountIdentityFields(
        { id: ownerEmail, email: ownerEmail },
        existingAccounts,
        existingReservations,
        businessName
      );
      const now = new Date().toISOString();

      const [reservationNum, reservationSlug] = await Promise.all([
        base44.entities.VendorAccountIdentityReservation.create({
          type: "vendor_account_number",
          value: identityFields.vendor_account_number,
          vendor_account_id: "pending",
          vendor_account_number: identityFields.vendor_account_number,
          vendor_slug: identityFields.vendor_slug,
          business_name_at_assignment: businessName,
          owner_user_id: ownerEmail,
          owner_email: ownerEmail,
          status: "reserved",
          reserved_at: now,
        }),
        base44.entities.VendorAccountIdentityReservation.create({
          type: "vendor_slug",
          value: identityFields.vendor_slug,
          vendor_account_id: "pending",
          vendor_account_number: identityFields.vendor_account_number,
          vendor_slug: identityFields.vendor_slug,
          business_name_at_assignment: businessName,
          owner_user_id: ownerEmail,
          owner_email: ownerEmail,
          status: "reserved",
          reserved_at: now,
        }),
      ]);

      const account = await base44.entities.VendorAccount.create({
        business_name: businessName,
        organization_type: "vendor",
        business_category: form.business_category.trim() || DEFAULT_CATEGORY,
        phone: form.phone.trim(),
        owner_email: ownerEmail,
        owner_user_id: ownerEmail,
        owner_name: ownerEmail,
        ...identityFields,
        vendor_tier: "free",
<<<<<<< HEAD
        subscription_status: "inactive",
=======
        subscription_status: "active",
>>>>>>> origin/main
        vendor_setup_status: "setup_required",
        extra_users_count: 0,
        extra_pins_count: 0,
        current_authorized_users: 1,
        current_vendor_pins: 0,
        is_active: true,
        vendor_origin: "field_assisted_created",
      });

      await Promise.all([
        base44.entities.VendorAccountIdentityReservation.update(reservationNum.id, { vendor_account_id: account.id, status: "assigned" }),
        base44.entities.VendorAccountIdentityReservation.update(reservationSlug.id, { vendor_account_id: account.id, status: "assigned" }),
      ]);

<<<<<<< HEAD
      const promo = await createSignupPromo({
        account,
        promoType: form.promo_type,
        promoDays: Number(form.promo_days || 30),
        adminUser,
      });

=======
>>>>>>> origin/main
      await base44.entities.AdminAuditLog.create({
        user_id: adminUser?.id,
        admin_employee_id: adminUser?.employee_id || adminUser?.email || adminUser?.id || "unknown",
        action_type: "admin_field_created_vendor_account",
        target_type: "VendorAccount",
        target_id: account.id,
        success: true,
        metadata: JSON.stringify({
          vendor_account_id: account.id,
          vendor_account_number: account.vendor_account_number,
          business_name: account.business_name,
          owner_email: account.owner_email,
          source: "field_vendor_signup",
<<<<<<< HEAD
          promo_type: form.promo_type,
          promo_days: form.promo_type === "none" ? null : Number(form.promo_days || 30),
          promo_id: promo?.id || null,
=======
>>>>>>> origin/main
          created_at: now,
        }),
      }).catch(() => null);

      setCreated(account);
      onCreated?.(account);
      toast.success("Vendor created. Ready for the live Yardit demo.");
    } catch (error) {
      console.error("Field vendor signup failed", error);
      toast.error(error?.message || "Could not create the vendor account.");
    } finally {
      setSaving(false);
    }
  };

  const startDemo = async () => {
    if (!created?.id) return;
    try {
      const existingPins = await base44.entities.VendorPin.filter({ vendor_account_id: created.id }).catch(() => []);
      let pin = existingPins.find((item) => item.is_active !== false) || null;
      if (!pin) {
        pin = await base44.entities.VendorPin.create({
          vendor_account_id: created.id,
          pin_name: created.business_name || "Vendor Location",
          pin_type: "vendor",
          is_active: true,
          is_open_to_vendors: false,
          created_at: new Date().toISOString(),
        });
        await base44.entities.VendorAccount.update(created.id, { current_vendor_pins: 1 });
      }
<<<<<<< HEAD
      const accountId = created.id;
      const pinId = pin.id;
      resetAndClose();
      navigate(`/VendorPinPreview?pinId=${encodeURIComponent(pinId)}&accountId=${encodeURIComponent(accountId)}&fieldDemo=1`);
=======
      resetAndClose();
      navigate(`/VendorPinPreview?pinId=${encodeURIComponent(pin.id)}&accountId=${encodeURIComponent(created.id)}&fieldDemo=1`);
>>>>>>> origin/main
    } catch (error) {
      console.error("Could not start field demo", error);
      toast.error("Vendor was created, but the demo pin could not be opened.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
<<<<<<< HEAD
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
=======
      <DialogContent className="max-w-md rounded-2xl">
>>>>>>> origin/main
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Field Vendor Signup</DialogTitle>
        </DialogHeader>

        {!created ? (
          <div className="space-y-4">
<<<<<<< HEAD
            <p className="text-sm text-slate-600">Create a claimable Vendor Account in under a minute. The vendor can finish setup and choose a paid subscription later.</p>
=======
            <p className="text-sm text-slate-600">Create a claimable Vendor Account in under a minute. The vendor can finish setup later.</p>
>>>>>>> origin/main
            <div className="space-y-1.5">
              <Label>Business Name *</Label>
              <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Business name" />
            </div>
            <div className="space-y-1.5">
              <Label>Vendor Email *</Label>
              <Input type="email" value={form.owner_email} onChange={(e) => update("owner_email", e.target.value)} placeholder="vendor@example.com" />
<<<<<<< HEAD
              <p className="text-xs text-slate-500">They must use this same email to claim the account.</p>
=======
              <p className="text-xs text-slate-500">They should use this same email when they sign in so Yardit can offer the account to them.</p>
>>>>>>> origin/main
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.business_category} onValueChange={(value) => update("business_category", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Event Vendor">Event Vendor</SelectItem>
                  <SelectItem value="Food Truck">Food Truck</SelectItem>
                  <SelectItem value="Food Vendor">Food Vendor</SelectItem>
                  <SelectItem value="Craft Vendor">Craft Vendor</SelectItem>
                  <SelectItem value="Retail Vendor">Retail Vendor</SelectItem>
                  <SelectItem value="Service Vendor">Service Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="font-normal text-slate-400">(optional)</span></Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Vendor phone" />
            </div>
<<<<<<< HEAD

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Signup Promo</p>
              <div className="space-y-1.5">
                <Label>Promo Type</Label>
                <Select value={form.promo_type} onValueChange={(value) => update("promo_type", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROMO_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.promo_type !== "none" && (
                <div className="space-y-1.5">
                  <Label>Promo Period</Label>
                  <Select value={form.promo_days} onValueChange={(value) => update("promo_days", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROMO_PERIODS.map((days) => <SelectItem key={days} value={String(days)}>{days} days</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

=======
>>>>>>> origin/main
            <Button onClick={createFieldVendor} disabled={saving} className="w-full bg-[#2C4F4E] text-white hover:bg-[#3d6b6a]">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Vendor & Start Demo"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-bold text-[#2C4F4E]">{created.business_name} is ready</p>
<<<<<<< HEAD
                  <p className="text-sm text-slate-600">Account created. The vendor can claim it, finish setup, and subscribe from their own Yardit login.</p>
=======
                  <p className="text-sm text-slate-600">Free account created. Setup can be finished later from the vendor's own login.</p>
>>>>>>> origin/main
                  <p className="mt-1 text-xs text-slate-500">Account #{created.vendor_account_number || created.id}</p>
                </div>
              </div>
            </div>
            <Button onClick={startDemo} className="w-full bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635] font-bold">
              <MapPin className="mr-2 h-4 w-4" /> Start Live Pin Demo
            </Button>
            <Button variant="outline" onClick={resetAndClose} className="w-full">Done for Now</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
