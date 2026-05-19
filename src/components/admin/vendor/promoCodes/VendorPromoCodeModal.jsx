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

const EMPTY = {
  code: "",
  promo_name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  valid_start_date: "",
  valid_end_date: "",
  active: true,
  applies_to_tiers: [],
  max_redemptions: "",
  one_use_per_user: true,
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
        valid_end_date: existingCode.valid_end_date ? existingCode.valid_end_date.slice(0, 10) : "",
        max_redemptions: existingCode.max_redemptions ?? "",
        applies_to_tiers: existingCode.applies_to_tiers || [],
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

    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      code: form.code.trim().toUpperCase(),
      promo_name: form.promo_name.trim(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: form.discount_type !== "custom" ? Number(form.discount_value) : null,
      valid_start_date: form.valid_start_date ? new Date(form.valid_start_date).toISOString() : null,
      valid_end_date: form.valid_end_date ? new Date(form.valid_end_date).toISOString() : null,
      active: form.active,
      applies_to_tiers: form.applies_to_tiers,
      max_redemptions: form.max_redemptions !== "" ? Number(form.max_redemptions) : null,
      one_use_per_user: form.one_use_per_user,
      updated_at: now,
    };

    try {
      let saved;
      if (existingCode?.id) {
        saved = await base44.entities.VendorPromoCode.update(existingCode.id, payload);
        await base44.entities.AdminAuditLog.create({
          admin_id: user?.id,
          admin_email: user?.email,
          action_type: "vendor_promo_code_updated",
          target_entity_type: "VendorPromoCode",
          target_entity_id: existingCode.id,
          description: `Updated promo code "${payload.code}" (${payload.promo_name}).`,
        }).catch(() => {});
      } else {
        saved = await base44.entities.VendorPromoCode.create({
          ...payload,
          redemptions_used: 0,
          created_by_admin_id: user?.id,
          created_by_admin_email: user?.email,
          created_at: now,
        });
        await base44.entities.AdminAuditLog.create({
          admin_id: user?.id,
          admin_email: user?.email,
          action_type: "vendor_promo_code_created",
          target_entity_type: "VendorPromoCode",
          target_entity_id: saved.id,
          description: `Created promo code "${payload.code}" (${payload.promo_name}).`,
        }).catch(() => {});
      }
      toast.success(existingCode ? "Promo code updated" : "Promo code created");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Failed to save promo code");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingCode ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Code & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Code <span className="text-red-500">*</span></Label>
              <Input
                placeholder="SUMMER30"
                value={form.code}
                onChange={e => update("code", e.target.value.toUpperCase())}
                className="uppercase font-mono"
              />
              <p className="text-[10px] text-slate-400">Auto-uppercased</p>
            </div>
            <div className="space-y-1">
              <Label>Promo Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Summer Discount" value={form.promo_name} onChange={e => update("promo_name", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description (shown to vendor)</Label>
            <Input placeholder="Get 30% off your first month" value={form.description} onChange={e => update("description", e.target.value)} />
          </div>

          {/* Discount type + value */}
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
                <Input
                  type="number"
                  min={0}
                  max={form.discount_type === "percentage" ? 100 : undefined}
                  placeholder={form.discount_type === "percentage" ? "30" : form.discount_type === "free_trial" ? "30" : "10"}
                  value={form.discount_value}
                  onChange={e => update("discount_value", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valid Start Date</Label>
              <Input type="date" value={form.valid_start_date} onChange={e => update("valid_start_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Expiration Date</Label>
              <Input type="date" value={form.valid_end_date} onChange={e => update("valid_end_date", e.target.value)} />
            </div>
          </div>

          {/* Eligible tiers */}
          <div className="space-y-2">
            <Label>Eligible Tiers <span className="text-xs text-slate-400">(leave empty = all tiers)</span></Label>
            <div className="flex flex-wrap gap-3">
              {TIERS.map(t => (
                <label key={t.key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={form.applies_to_tiers.includes(t.key)}
                    onCheckedChange={() => toggleTier(t.key)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Usage limits */}
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

          {/* Active toggle */}
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