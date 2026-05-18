import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { addDays, addMonths, format } from "date-fns";

const PROMO_TYPES = [
  { value: "percentage_discount", label: "Percentage Discount" },
  { value: "free_events", label: "Free Events" },
  { value: "free_checkins", label: "Free Check-ins" },
  { value: "bonus_pins", label: "Bonus / Free Pins" },
  { value: "tier_comp", label: "Tier Comp / Trial Access" },
];

const QUICK_TEMPLATES = [
  { label: "1 Free Event", promo_type: "free_events", promo_value: 1, event_type_limit: "any", duration_type: "days", duration_value: 90, promo_description: "1 free event (any type)" },
  { label: "50% Off First Month", promo_type: "percentage_discount", promo_value: 50, duration_type: "billing_cycles", duration_value: 1, promo_description: "50% off for 1 billing cycle" },
  { label: "Free Growth Trial 30d", promo_type: "tier_comp", promo_tier: "growth", duration_type: "days", duration_value: 30, promo_description: "Free Growth tier trial for 30 days" },
  { label: "5 Free Check-ins", promo_type: "free_checkins", promo_value: 5, duration_type: "days", duration_value: 60, promo_description: "5 free check-ins within 60 days" },
  { label: "Event Organizer Trial", promo_type: "tier_comp", promo_tier: "event_organizer", duration_type: "days", duration_value: 30, promo_description: "Event Organizer tier trial for 30 days" },
  { label: "+2 Bonus Pins 60d", promo_type: "bonus_pins", promo_value: 2, duration_type: "days", duration_value: 60, promo_description: "+2 bonus pins for 60 days" },
];

function calcEndDate(durationType, durationValue) {
  const now = new Date();
  if (durationType === "days") return addDays(now, durationValue || 30);
  if (durationType === "months") return addMonths(now, durationValue || 1);
  if (durationType === "billing_cycles") return addMonths(now, (durationValue || 1) * 1);
  if (durationType === "unlimited") return null;
  return null;
}

export default function VendorPromoModal({ open, onClose, account, user, onPromoCreated }) {
  const defaultForm = {
    promo_type: "percentage_discount",
    promo_value: 25,
    promo_tier: "growth",
    event_type_limit: "any",
    duration_type: "days",
    duration_value: 30,
    end_date_override: "",
    reason_note: "",
    promo_description: "",
  };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const applyTemplate = (tpl) => {
    setForm(prev => ({
      ...prev,
      promo_type: tpl.promo_type,
      promo_value: tpl.promo_value ?? prev.promo_value,
      promo_tier: tpl.promo_tier ?? prev.promo_tier,
      event_type_limit: tpl.event_type_limit ?? "any",
      duration_type: tpl.duration_type ?? "days",
      duration_value: tpl.duration_value ?? 30,
      promo_description: tpl.promo_description ?? "",
    }));
  };

  const computedEndDate = form.duration_type === "until_date"
    ? (form.end_date_override ? new Date(form.end_date_override) : null)
    : calcEndDate(form.duration_type, form.duration_value);

  const summaryLabel = (() => {
    if (form.promo_type === "percentage_discount") return `${form.promo_value}% discount`;
    if (form.promo_type === "free_events") return `${form.promo_value} free event(s) (${form.event_type_limit})`;
    if (form.promo_type === "free_checkins") return `${form.promo_value} free check-in(s)`;
    if (form.promo_type === "bonus_pins") return `+${form.promo_value} bonus pin(s)`;
    if (form.promo_type === "tier_comp") return `Free ${form.promo_tier?.replace("_", " ")} tier`;
    return "Promotion";
  })();

  const handleApply = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const now = new Date();
      const isCountBased = ["free_events", "free_checkins", "bonus_pins"].includes(form.promo_type);
      const promo = {
        vendor_account_id: account.id,
        vendor_account_number: account.vendor_account_number || "",
        business_name: account.business_name || "",
        owner_user_id: account.owner_user_id || "",
        promo_type: form.promo_type,
        promo_value: isCountBased || form.promo_type === "percentage_discount" ? Number(form.promo_value) : null,
        promo_tier: form.promo_type === "tier_comp" ? form.promo_tier : null,
        event_type_limit: form.promo_type === "free_events" ? form.event_type_limit : null,
        promo_description: form.promo_description || summaryLabel,
        duration_type: form.duration_type,
        duration_value: form.duration_type !== "until_date" && form.duration_type !== "unlimited" ? Number(form.duration_value) : null,
        start_date: now.toISOString(),
        end_date: computedEndDate ? computedEndDate.toISOString() : null,
        status: "active",
        granted_count: isCountBased ? Number(form.promo_value) : 0,
        used_count: 0,
        reason_note: form.reason_note || "",
        created_by_admin_id: user?.id || "",
        created_by_admin_name: user?.full_name || user?.email || "",
      };

      const created = await base44.entities.VendorPromotion.create(promo);

      // Write to AdminAuditLog
      await base44.entities.AdminAuditLog.create({
        admin_id: user?.id,
        admin_employee_id: user?.employee_id || user?.id,
        action_type: "admin_granted_vendor_promotion",
        target_type: "VendorAccount",
        target_id: account.id,
        success: true,
        metadata: JSON.stringify({
          affected_user_id: account.owner_user_id,
          vendor_id: account.id,
          vendor_account_number: account.vendor_account_number,
          business_name: account.business_name,
          promo_id: created.id,
          promo_type: form.promo_type,
          promo_description: promo.promo_description,
          estimated_value: form.promo_type === "percentage_discount" ? `${form.promo_value}% off` : (form.promo_type === "tier_comp" ? `Free ${form.promo_tier} tier` : `${form.promo_value} ${form.promo_type}`),
          end_date: promo.end_date,
          reason: form.reason_note || null,
          created_at: new Date().toISOString(),
        }),
      }).catch(() => {}); // audit log failure should not block

      toast.success(`Promo applied to ${account.business_name}`);
      onPromoCreated?.();
      onClose();
      setForm(defaultForm);
    } catch (err) {
      toast.error("Failed to apply promo: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setForm(defaultForm); } }}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#2C4F4E]">
            <Zap className="w-4 h-4 text-amber-500" />
            Apply Promotion
          </DialogTitle>
          {account && (
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-medium text-slate-700">{account.business_name}</span>
              {" · "}{account.vendor_account_number}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Quick Templates */}
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Quick Templates</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map(tpl => (
                <button
                  key={tpl.label}
                  onClick={() => applyTemplate(tpl)}
                  className="text-xs px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Promo Type */}
          <div className="space-y-1">
            <Label>Promo Type</Label>
            <Select value={form.promo_type} onValueChange={v => set("promo_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROMO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Promo-specific fields */}
          {form.promo_type === "percentage_discount" && (
            <div className="space-y-1">
              <Label>Discount Percentage (%)</Label>
              <Input type="number" min={1} max={100} value={form.promo_value} onChange={e => set("promo_value", e.target.value)} />
            </div>
          )}

          {form.promo_type === "free_events" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Free Event Count</Label>
                <Input type="number" min={1} value={form.promo_value} onChange={e => set("promo_value", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Event Type</Label>
                <Select value={form.event_type_limit} onValueChange={v => set("event_type_limit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Type</SelectItem>
                    <SelectItem value="single">Single Events</SelectItem>
                    <SelectItem value="multi_spot">Multi-Spot</SelectItem>
                    <SelectItem value="multi_location">Multi-Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {form.promo_type === "free_checkins" && (
            <div className="space-y-1">
              <Label>Free Check-in Count</Label>
              <Input type="number" min={1} value={form.promo_value} onChange={e => set("promo_value", e.target.value)} />
            </div>
          )}

          {form.promo_type === "bonus_pins" && (
            <div className="space-y-1">
              <Label>Bonus Pin Count</Label>
              <Input type="number" min={1} max={10} value={form.promo_value} onChange={e => set("promo_value", e.target.value)} />
            </div>
          )}

          {form.promo_type === "tier_comp" && (
            <div className="space-y-1">
              <Label>Comped Tier</Label>
              <Select value={form.promo_tier} onValueChange={v => set("promo_tier", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="event_organizer">Event Organizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Duration Type</Label>
              <Select value={form.duration_type} onValueChange={v => set("duration_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="billing_cycles">Billing Cycles</SelectItem>
                  <SelectItem value="until_date">Until Specific Date</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.duration_type !== "until_date" && form.duration_type !== "unlimited" && (
              <div className="space-y-1">
                <Label>Duration Value</Label>
                <Input type="number" min={1} value={form.duration_value} onChange={e => set("duration_value", e.target.value)} />
              </div>
            )}
            {form.duration_type === "until_date" && (
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date_override} onChange={e => set("end_date_override", e.target.value)} />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description <span className="text-slate-400">(optional)</span></Label>
            <Input placeholder={summaryLabel} value={form.promo_description} onChange={e => set("promo_description", e.target.value)} />
          </div>

          {/* Internal Note */}
          <div className="space-y-1">
            <Label>Internal Admin Note <span className="text-slate-400">(optional)</span></Label>
            <Input placeholder="Why this promo was applied..." value={form.reason_note} onChange={e => set("reason_note", e.target.value)} />
          </div>

          {/* Summary Preview */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Preview</p>
            <p className="text-sm font-medium text-slate-800">{summaryLabel}</p>
            <p className="text-xs text-slate-500">
              Expires: {computedEndDate ? format(computedEndDate, "MMM d, yyyy") : "Never / Unlimited"}
            </p>
            {form.duration_type !== "until_date" && form.duration_type !== "unlimited" && (
              <p className="text-xs text-slate-500">Duration: {form.duration_value} {form.duration_type}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => { onClose(); setForm(defaultForm); }}>Cancel</Button>
            <Button
              onClick={handleApply}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Apply Promotion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}