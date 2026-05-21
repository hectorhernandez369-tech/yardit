import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TIERS = [
  { key: "starter", label: "Starter" },
  { key: "pro", label: "Pro" },
  { key: "growth", label: "Growth" },
  { key: "event_organizer", label: "Event Organizer" },
];

const TIER_LABELS = {
  starter: "Starter", pro: "Pro", growth: "Growth", event_organizer: "Event Organizer",
};

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
  const [showTierModal, setShowTierModal] = useState(false);

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
        <div className="space-y-4 pt-2 text-sm">

          {/* Line 1: Code & Name */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px] space-y-1">
              <Label className="text-xs">Promo Code <span className="text-red-500">*</span></Label>
              <Input placeholder="SUMMER30" value={form.code} onChange={e => update("code", e.target.value.toUpperCase())} className="uppercase font-mono text-base" />
            </div>
            <span className="text-slate-500 mb-2">named</span>
            <div className="flex-1 min-w-[160px] space-y-1">
              <Label className="text-xs">Promo Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Summer Discount" value={form.promo_name} onChange={e => update("promo_name", e.target.value)} />
            </div>
          </div>

          {/* Line 2: Description */}
          <div className="space-y-1">
            <Label className="text-xs">Description (shown to vendor)</Label>
            <Input placeholder="e.g. Get a special introductory rate" value={form.description} onChange={e => update("description", e.target.value)} />
          </div>

          {/* Line 3: Discount offer */}
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-slate-600 font-medium">Offer</span>
            <div className="flex-1 min-w-[120px] space-y-1">
              <Select value={form.discount_type} onValueChange={v => update("discount_type", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.discount_type !== "custom" && (
              <div className="flex-1 min-w-[80px] space-y-1">
                <Input type="number" min={0} max={form.discount_type === "percentage" ? 100 : undefined} placeholder="30" value={form.discount_value} onChange={e => update("discount_value", e.target.value)} className="text-sm" />
              </div>
            )}
            {form.discount_type === "percentage" && <span className="text-slate-500 mb-1">%</span>}
            {form.discount_type === "fixed_amount" && <span className="text-slate-500 mb-1">$ off</span>}
            {form.discount_type === "free_trial" && <span className="text-slate-500 mb-1">days free</span>}
            <span className="text-slate-500 mb-1">to</span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {form.applies_to_tiers.length === 0 ? (
                <span className="text-slate-600 font-medium">all tiers</span>
              ) : (
                form.applies_to_tiers.map(t => <Badge key={t} className="bg-slate-100 text-slate-700 text-[11px]">{TIER_LABELS[t]}</Badge>)
              )}
              <button onClick={() => setShowTierModal(!showTierModal)} className="text-[#5DADA5] hover:text-[#2C4F4E] text-xs font-semibold underline">
                {form.applies_to_tiers.length === 0 ? "choose" : "change"}
              </button>
            </div>
          </div>

          {/* Tier selector modal inline */}
          {showTierModal && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">Which tiers?</p>
              <div className="flex flex-wrap gap-2">
                {TIERS.map(t => (
                  <label key={t.key} className="flex items-center gap-2 cursor-pointer text-xs">
                    <Checkbox checked={form.applies_to_tiers.includes(t.key)} onCheckedChange={() => toggleTier(t.key)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Line 4: Dates */}
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-slate-600 font-medium">Valid</span>
            <div className="flex-1 min-w-[120px] space-y-1">
              <Input type="date" value={form.valid_start_date} onChange={e => update("valid_start_date", e.target.value)} className="text-xs" />
            </div>
            <span className="text-slate-500 mb-1">to</span>
            <div className="flex-1 min-w-[120px] space-y-1">
              <Input type="date" value={form.redeem_by_date} onChange={e => update("redeem_by_date", e.target.value)} className="text-xs" />
              <p className="text-[10px] text-slate-400">new redemptions only</p>
            </div>
          </div>

          {/* Line 5: Benefit Duration */}
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-slate-600 font-medium">Benefits last</span>
            <div className="flex-1 min-w-[140px] space-y-1">
              <Select value={form.promotion_duration_type} onValueChange={v => update("promotion_duration_type", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_expiration">forever</SelectItem>
                  <SelectItem value="preset_days">for X days</SelectItem>
                  <SelectItem value="fixed_end_date">until a date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.promotion_duration_type === "preset_days" && (
              <>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {DURATION_PRESETS.map(d => (
                    <button key={d} type="button" onClick={() => update("promotion_duration_days", d)}
                      className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${Number(form.promotion_duration_days) === d ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white text-slate-600 border-slate-200 hover:border-[#2C4F4E]"}`}>
                      {d}d
                    </button>
                  ))}
                  <input type="number" min={1} placeholder="other" value={form.promotion_duration_days} onChange={e => update("promotion_duration_days", e.target.value)} className="w-12 px-1.5 py-1 rounded border border-slate-200 text-xs text-center" />
                </div>
              </>
            )}
            {form.promotion_duration_type === "fixed_end_date" && (
              <div className="flex-1 min-w-[120px] space-y-1">
                <Input type="date" value={form.promotion_end_date} onChange={e => update("promotion_end_date", e.target.value)} className="text-xs" />
              </div>
            )}
          </div>

          {/* Line 6: Redemption limits */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">Limit to</span>
            <div className="w-16 space-y-1">
              <Input type="number" min={1} placeholder="∞" value={form.max_redemptions} onChange={e => update("max_redemptions", e.target.value)} className="text-xs text-center" />
            </div>
            <span className="text-slate-500">uses total</span>
            {form.max_redemptions !== "" && (
              <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                <Switch checked={form.allow_slot_recovery} onCheckedChange={v => update("allow_slot_recovery", v)} size="sm" />
                <span className="text-[10px] text-slate-600">recover slots on removal</span>
              </label>
            )}
            <label className="flex items-center gap-1.5 cursor-pointer ml-2">
              <Switch checked={form.one_use_per_user} onCheckedChange={v => update("one_use_per_user", v)} size="sm" />
              <span className="text-[10px] text-slate-600">one per user</span>
            </label>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 my-2" />

          {/* Founding Vendor Section */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.is_founding_vendor} onCheckedChange={v => update("is_founding_vendor", v)} />
              <span className="text-xs font-semibold text-amber-900">Lock in founding pricing after trial</span>
            </label>
            {form.is_founding_vendor && (
              <div className="flex flex-wrap items-end gap-2 pl-6 text-xs">
                <span className="text-amber-800 font-medium">Recurring rate:</span>
                <span className="text-amber-700">$</span>
                <div className="w-20 space-y-1">
                  <Input type="number" min={0} step={0.01} placeholder="9.99" value={form.founding_recurring_price} onChange={e => update("founding_recurring_price", e.target.value)} className="text-xs text-center" />
                </div>
                <span className="text-amber-700">/month</span>
                <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                  <Switch checked={form.founding_forfeits_on_cancel} onCheckedChange={v => update("founding_forfeits_on_cancel", v)} />
                  <span className="text-[10px] text-amber-700">forfeit on cancel</span>
                </label>
              </div>
            )}
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white">
            <Switch checked={form.active} onCheckedChange={v => update("active", v)} />
            <div className="text-xs">
              <p className="font-semibold text-slate-700">{form.active ? "Active" : "Inactive"}</p>
              <p className="text-slate-500">{form.active ? "Vendors can apply at checkout" : "Disabled"}</p>
            </div>
          </div>

          {/* Actions */}
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