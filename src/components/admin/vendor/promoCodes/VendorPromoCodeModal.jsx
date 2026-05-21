import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TIERS = [
  { key: "starter", label: "Starter" },
  { key: "pro", label: "Pro" },
  { key: "growth", label: "Growth" },
  { key: "event_organizer", label: "Event Organizer" },
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage Off" },
  { value: "fixed_amount", label: "Fixed Amount Off" },
  { value: "free_trial", label: "Free Trial (days)" },
  { value: "custom", label: "Custom / Manual" },
];

const DURATION_PRESETS = [7, 10, 30, 45, 60, 90];

const EMPTY = {
  code: "",
  promo_name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  valid_start_date: "",
  redeem_by_date: "",
  active: true,
  applies_to_tiers: [],
  max_redemptions: "",
  allow_slot_recovery: false,
  one_use_per_user: true,
  promotion_duration_type: "no_expiration",
  promotion_duration_days: "",
  promotion_end_date: "",
  is_founding_vendor: false,
  founding_recurring_price: "",
  founding_forfeits_on_cancel: true,
};

export default function VendorPromoCodeModal({ open, onClose, existingCode, user, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingCode) {
      setForm({
        ...EMPTY,
        ...existingCode,
        valid_start_date: existingCode.valid_start_date ? existingCode.valid_start_date.slice(0, 10) : "",
        redeem_by_date: existingCode.redeem_by_date ? existingCode.redeem_by_date.slice(0, 10) : "",
        promotion_end_date: existingCode.promotion_end_date ? existingCode.promotion_end_date.slice(0, 10) : "",
        max_redemptions: existingCode.max_redemptions ?? "",
        promotion_duration_days: existingCode.promotion_duration_days ?? "",
        founding_recurring_price: existingCode.founding_recurring_price ?? "",
        applies_to_tiers: existingCode.applies_to_tiers || [],
        promotion_duration_type: existingCode.promotion_duration_type || "no_expiration",
      });
    } else {
      setForm(EMPTY);
    }
  }, [existingCode, open]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleTier = (key) => {
    setForm(prev => ({
      ...prev,
      applies_to_tiers: prev.applies_to_tiers.includes(key)
        ? prev.applies_to_tiers.filter(t => t !== key)
        : [...prev.applies_to_tiers, key],
    }));
  };

  const discountLabel = form.discount_type === "percentage" ? "%" : form.discount_type === "fixed_amount" ? "$ Off" : form.discount_type === "free_trial" ? "Days Free" : "Value";

  const handleSave = async () => {
    if (!form.code.trim()) return toast.error("Promo code is required.");
    if (!form.promo_name.trim()) return toast.error("Promo name is required.");
    if (!form.discount_type) return toast.error("Discount type is required.");
    if (form.discount_type !== "custom" && (form.discount_value === "" || isNaN(Number(form.discount_value)))) {
      return toast.error("Discount value is required.");
    }
    if (form.promotion_duration_type === "preset_days" && (!form.promotion_duration_days || isNaN(Number(form.promotion_duration_days)))) {
      return toast.error("Promotion duration days is required.");
    }
    if (form.promotion_duration_type === "fixed_end_date" && !form.promotion_end_date) {
      return toast.error("Promotion end date is required.");
    }

    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      code: form.code.trim().toUpperCase(),
      promo_name: form.promo_name.trim(),
      description: form.description?.trim() || "",
      discount_type: form.discount_type,
      discount_value: form.discount_type !== "custom" ? Number(form.discount_value) : null,
      valid_start_date: form.valid_start_date ? new Date(form.valid_start_date).toISOString() : null,
      redeem_by_date: form.redeem_by_date ? new Date(form.redeem_by_date).toISOString() : null,
      active: form.active,
      applies_to_tiers: form.applies_to_tiers,
      max_redemptions: form.max_redemptions !== "" ? Number(form.max_redemptions) : null,
      allow_slot_recovery: !!form.allow_slot_recovery,
      one_use_per_user: form.one_use_per_user,
      promotion_duration_type: form.promotion_duration_type,
      promotion_duration_days: form.promotion_duration_type === "preset_days" && form.promotion_duration_days !== "" ? Number(form.promotion_duration_days) : null,
      promotion_end_date: form.promotion_duration_type === "fixed_end_date" && form.promotion_end_date ? new Date(form.promotion_end_date).toISOString() : null,
      is_founding_vendor: !!form.is_founding_vendor,
      founding_recurring_price: form.is_founding_vendor && form.founding_recurring_price !== "" ? Number(form.founding_recurring_price) : null,
      founding_forfeits_on_cancel: !!form.founding_forfeits_on_cancel,
      updated_at: now,
    };

    try {
      let saved;
      if (existingCode?.id) {
        saved = await base44.entities.VendorPromoCode.update(existingCode.id, payload);
        await base44.entities.AdminAuditLog.create({
          admin_id: user?.id, admin_email: user?.email,
          action_type: "vendor_promo_code_updated",
          target_entity_type: "VendorPromoCode",
          target_entity_id: existingCode.id,
          description: `Updated promo code "${payload.code}".`,
        }).catch(() => {});
      } else {
        saved = await base44.entities.VendorPromoCode.create({
          ...payload,
          redemptions_used: 0,
          current_redemptions: 0,
          created_by_admin_id: user?.id,
          created_by_admin_email: user?.email,
          created_at: now,
        });
        await base44.entities.AdminAuditLog.create({
          admin_id: user?.id, admin_email: user?.email,
          action_type: "vendor_promo_code_created",
          target_entity_type: "VendorPromoCode",
          target_entity_id: saved.id,
          description: `Created promo code "${payload.code}".`,
        }).catch(() => {});
      }
      toast.success(existingCode ? "Promo code updated" : "Promo code created");
      onSaved?.();
      onClose();
    } catch {
      toast.error("Failed to save promo code");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingCode ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">

          {/* Code & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Code <span className="text-red-500">*</span></Label>
              <Input placeholder="SUMMER30" value={form.code} onChange={e => update("code", e.target.value.toUpperCase())} className="uppercase font-mono" />
            </div>
            <div className="space-y-1">
              <Label>Promo Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Summer Discount" value={form.promo_name} onChange={e => update("promo_name", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description (shown to vendor)</Label>
            <Input placeholder="Get 30% off your first month" value={form.description} onChange={e => update("description", e.target.value)} />
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Discount Type <span className="text-red-500">*</span></Label>
              <Select value={form.discount_type} onValueChange={v => update("discount_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.discount_type !== "custom" && (
              <div className="space-y-1">
                <Label>{discountLabel} Value <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} max={form.discount_type === "percentage" ? 100 : undefined} placeholder={form.discount_type === "percentage" ? "30" : "30"} value={form.discount_value} onChange={e => update("discount_value", e.target.value)} />
              </div>
            )}
          </div>

          {/* Redeem Window */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Redeem Window</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valid From</Label>
                <Input type="date" value={form.valid_start_date} onChange={e => update("valid_start_date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Redeem By Date</Label>
                <Input type="date" value={form.redeem_by_date} onChange={e => update("redeem_by_date", e.target.value)} />
                <p className="text-[10px] text-slate-400">New users cannot redeem after this date</p>
              </div>
            </div>
          </div>

          {/* Promotion Duration */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Benefit Duration</p>
            <div className="space-y-1">
              <Label>Duration Type</Label>
              <Select value={form.promotion_duration_type} onValueChange={v => update("promotion_duration_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_expiration">No Expiration</SelectItem>
                  <SelectItem value="preset_days">Preset Days (from redemption date)</SelectItem>
                  <SelectItem value="fixed_end_date">Fixed End Date (same for all)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.promotion_duration_type === "preset_days" && (
              <div className="space-y-2">
                <Label>Duration Days <span className="text-red-500">*</span></Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {DURATION_PRESETS.map(d => (
                    <button key={d} type="button" onClick={() => update("promotion_duration_days", d)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${Number(form.promotion_duration_days) === d ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white text-slate-600 border-slate-200 hover:border-[#2C4F4E]"}`}>
                      {d}d
                    </button>
                  ))}
                  <button type="button" onClick={() => update("promotion_duration_days", "")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${!DURATION_PRESETS.includes(Number(form.promotion_duration_days)) && form.promotion_duration_days !== "" ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white text-slate-600 border-slate-200 hover:border-[#2C4F4E]"}`}>
                    Custom
                  </button>
                </div>
                <Input type="number" min={1} placeholder="e.g. 30" value={form.promotion_duration_days} onChange={e => update("promotion_duration_days", e.target.value)} />
                <p className="text-[10px] text-slate-400">Benefits expire X days after the vendor redeems the code</p>
              </div>
            )}

            {form.promotion_duration_type === "fixed_end_date" && (
              <div className="space-y-1">
                <Label>Benefits End Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.promotion_end_date} onChange={e => update("promotion_end_date", e.target.value)} />
                <p className="text-[10px] text-slate-400">All vendors' benefits expire on this date regardless of when they redeemed</p>
              </div>
            )}
          </div>

          {/* Eligible Tiers */}
          <div className="space-y-2">
            <Label>Eligible Tiers <span className="text-xs text-slate-400">(empty = all tiers)</span></Label>
            <div className="flex flex-wrap gap-3">
              {TIERS.map(t => (
                <label key={t.key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={form.applies_to_tiers.includes(t.key)} onCheckedChange={() => toggleTier(t.key)} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Redemption Limits */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Redemption Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Max Redemptions <span className="text-xs text-slate-400">(blank = unlimited)</span></Label>
                <Input type="number" min={1} placeholder="Unlimited" value={form.max_redemptions} onChange={e => update("max_redemptions", e.target.value)} />
              </div>
              <div className="space-y-2 flex flex-col justify-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <Switch checked={form.one_use_per_user} onCheckedChange={v => update("one_use_per_user", v)} />
                  One use per user
                </label>
              </div>
            </div>
            {form.max_redemptions !== "" && (
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Switch checked={form.allow_slot_recovery} onCheckedChange={v => update("allow_slot_recovery", v)} />
                <div>
                  <span className="font-medium">Allow slot recovery</span>
                  <p className="text-[10px] text-slate-400">When admin removes a redemption, they can reopen the slot</p>
                </div>
              </label>
            )}
          </div>

          {/* Founding Vendor */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Founding Vendor</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Lock in special recurring pricing after trial</p>
              </div>
              <Switch checked={form.is_founding_vendor} onCheckedChange={v => update("is_founding_vendor", v)} />
            </div>
            {form.is_founding_vendor && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Locked Monthly Price ($ / mo)</Label>
                  <Input type="number" min={0} step={0.01} placeholder="9.99" value={form.founding_recurring_price} onChange={e => update("founding_recurring_price", e.target.value)} />
                  <p className="text-[10px] text-amber-600">Vendor pays this price/month after trial ends (while subscription is active)</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch checked={form.founding_forfeits_on_cancel} onCheckedChange={v => update("founding_forfeits_on_cancel", v)} />
                  <span>Forfeit grandfathered pricing if subscription is canceled</span>
                </label>
              </div>
            )}
          </div>

          {/* Active */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border">
            <Switch checked={form.active} onCheckedChange={v => update("active", v)} />
            <div>
              <p className="text-sm font-medium">{form.active ? "Active" : "Inactive"}</p>
              <p className="text-xs text-slate-400">{form.active ? "Vendors can apply this code at checkout" : "Code is disabled"}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
              {saving ? "Saving..." : existingCode ? "Save Changes" : "Create Code"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}