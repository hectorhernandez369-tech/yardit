import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import GeoPromoSection from "@/components/admin/promo-geo/GeoPromoSection";

const DEFAULT_FORM = {
  code: "",
  title: "",
  description: "",
  status: "draft",
  discount_type: "percentage",
  default_discount_percent: 25,
  early_discount_enabled: false,
  early_discount_limit: 50,
  early_discount_percent: 100,
  early_discount_used_count: 0,
  early_visibility_enabled: false,
  early_visibility_days: 0,
  max_total_uses: "",
  total_used_count: 0,
  per_user_limit: 1,
  starts_at: "",
  expires_at: "",
  applies_to_tiers: ["featured", "premium"],
  coverage_type: "nationwide",
  coverage_state: "",
  coverage_county: "",
  coverage_city: "",
  coverage_town: "",
  coverage_zip: "",
  notes: "",
  geographic_limit_enabled: false,
  geographic_limit_type: "none",
  eligible_cities: [],
  eligible_zips: [],
  geo_center_lat: null,
  geo_center_lng: null,
  geo_radius_miles: 5,
  geo_polygon_coordinates: [],
  geo_display_label: "",
};

const TIER_OPTIONS = ["featured", "premium", "marquee"];

export default function ResidentialPromoCodeModal({ open, onClose, existingPromo, adminUser, onSaved }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingPromo) {
      setForm({
        ...DEFAULT_FORM,
        ...existingPromo,
        max_total_uses: existingPromo.max_total_uses != null ? String(existingPromo.max_total_uses) : "",
        starts_at: existingPromo.starts_at ? existingPromo.starts_at.slice(0, 16) : "",
        expires_at: existingPromo.expires_at ? existingPromo.expires_at.slice(0, 16) : "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [existingPromo, open]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTier = (tier) => {
    setForm((prev) => {
      const tiers = prev.applies_to_tiers || [];
      if (tiers.includes(tier)) {
        return { ...prev, applies_to_tiers: tiers.filter(t => t !== tier) };
      } else {
        return { ...prev, applies_to_tiers: [...tiers, tier] };
      }
    });
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Promo code is required."); return; }
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.default_discount_percent || Number(form.default_discount_percent) <= 0) {
      toast.error("Default discount percent is required."); return;
    }
    if (form.early_discount_enabled && (!form.early_discount_limit || !form.early_discount_percent)) {
      toast.error("Early discount limit and percent are required when early discount is enabled."); return;
    }
    if ((form.applies_to_tiers || []).length === 0) {
      toast.error("Select at least one tier this code applies to."); return;
    }
    if (form.early_visibility_enabled && Number(form.early_visibility_days || 0) <= 0) {
      toast.error("Early Visibility days are required when Early Visibility is enabled."); return;
    }
    if (form.geographic_limit_enabled && form.geographic_limit_type === "radius" && (!form.geo_center_lat || !form.geo_center_lng || !form.geo_radius_miles)) {
      toast.error("Select a center point and radius for this promo area."); return;
    }
    if (form.geographic_limit_enabled && form.geographic_limit_type === "polygon" && (form.geo_polygon_coordinates || []).length < 3) {
      toast.error("Draw at least 3 map points for the promo area."); return;
    }

    setSaving(true);
    try {
      const geoPayload = {
        geographic_limit_enabled: !!form.geographic_limit_enabled,
        geographic_limit_type: form.geographic_limit_enabled ? (form.geographic_limit_type || "none") : "none",
        eligible_cities: form.eligible_cities || [],
        eligible_zips: form.eligible_zips || [],
        geo_center_lat: form.geographic_limit_type === "radius" ? (form.geo_center_lat || null) : null,
        geo_center_lng: form.geographic_limit_type === "radius" ? (form.geo_center_lng || null) : null,
        geo_radius_miles: form.geographic_limit_type === "radius" ? (Number(form.geo_radius_miles) || 5) : null,
        geo_polygon_coordinates: form.geographic_limit_type === "polygon" ? (form.geo_polygon_coordinates || []) : [],
        geo_display_label: form.geo_display_label?.trim() || null,
      };

      const payload = {
        ...form,
        ...geoPayload,
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        default_discount_percent: Number(form.default_discount_percent),
        early_discount_limit: form.early_discount_enabled ? Number(form.early_discount_limit) : null,
        early_discount_percent: form.early_discount_enabled ? Number(form.early_discount_percent) : null,
        early_visibility_enabled: form.early_visibility_enabled === true,
        early_visibility_days: form.early_visibility_enabled ? Number(form.early_visibility_days || 0) : 0,
        per_user_limit: Number(form.per_user_limit) || 1,
        max_total_uses: form.max_total_uses !== "" ? Number(form.max_total_uses) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        updated_at: new Date().toISOString(),
        created_by_admin_id: adminUser?.id || form.created_by_admin_id || "",
        created_by_admin_email: adminUser?.email || form.created_by_admin_email || "",
      };

      if (!payload.created_at || !existingPromo?.id) {
        payload.created_at = new Date().toISOString();
        payload.total_used_count = 0;
        payload.early_discount_used_count = 0;
      }

      if (existingPromo?.id) {
        await base44.entities.ResidentialPromoCode.update(existingPromo.id, payload);
        toast.success("Promo code updated.");
      } else {
        await base44.entities.ResidentialPromoCode.create(payload);
        toast.success("Promo code created.");
      }

      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to save promo code.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#2C4F4E]">{existingPromo?.id ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Basic Info */}
          <Section title="Basic Info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Promo Code *">
                <Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase().trim())} placeholder="LINDSAYLAUNCH" className="font-mono" />
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Title *" className="sm:col-span-2">
                <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Lindsay Launch Weekend" />
              </Field>
              <Field label="Description / Notes" className="sm:col-span-2">
                <Input value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." />
              </Field>
            </div>
          </Section>

          {/* Discount */}
          <Section title="Discount">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Default Discount (%) *">
                <Input type="number" min="1" max="100" value={form.default_discount_percent} onChange={e => set("default_discount_percent", e.target.value)} placeholder="25" />
              </Field>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Checkbox
                id="early_enabled"
                checked={!!form.early_discount_enabled}
                onCheckedChange={v => set("early_discount_enabled", v)}
              />
              <label htmlFor="early_enabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                Enable Early-Bird Discount (first X uses get a higher discount)
              </label>
            </div>
            {form.early_discount_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pl-6 border-l-2 border-[#006168]/20">
                <Field label="First X Uses Get Early Rate">
                  <Input type="number" min="1" value={form.early_discount_limit} onChange={e => set("early_discount_limit", e.target.value)} placeholder="50" />
                </Field>
                <Field label="Early Discount (%)">
                  <Input type="number" min="1" max="100" value={form.early_discount_percent} onChange={e => set("early_discount_percent", e.target.value)} placeholder="100" />
                </Field>
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Example: First {form.early_discount_limit || "X"} users get {form.early_discount_percent || "Y"}% off. After that, {form.default_discount_percent || "Z"}% off.
                </p>
              </div>
            )}
          </Section>

          <Section title="Early Visibility">
            <div className="flex items-center gap-2">
              <Checkbox
                id="early_visibility_enabled"
                checked={!!form.early_visibility_enabled}
                onCheckedChange={v => set("early_visibility_enabled", v)}
              />
              <label htmlFor="early_visibility_enabled" className="text-sm font-medium text-slate-700 cursor-pointer">
                Show eligible listings early using Coming Soon
              </label>
            </div>
            {form.early_visibility_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pl-6 border-l-2 border-[#006168]/20">
                <Field label="Days Before Sale Date">
                  <Input type="number" min="1" value={form.early_visibility_days} onChange={e => set("early_visibility_days", e.target.value)} placeholder="14" />
                </Field>
                <p className="text-xs text-slate-500 sm:col-span-2">
                  This stores Early Visibility on the specific listing that redeems the code; future listings do not inherit it.
                </p>
              </div>
            )}
          </Section>

          {/* Limits */}
          <Section title="Limits & Dates">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Max Total Uses (blank = unlimited)">
                <Input type="number" min="1" value={form.max_total_uses} onChange={e => set("max_total_uses", e.target.value)} placeholder="500" />
              </Field>
              <Field label="Per-User Limit">
                <Input type="number" min="1" value={form.per_user_limit} onChange={e => set("per_user_limit", e.target.value)} placeholder="1" />
              </Field>
              <Field label="Start Date / Time">
                <Input type="datetime-local" value={form.starts_at} onChange={e => set("starts_at", e.target.value)} />
              </Field>
              <Field label="Expiration Date / Time">
                <Input type="datetime-local" value={form.expires_at} onChange={e => set("expires_at", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Applies To */}
          <Section title="Applies To (Tiers)">
            <p className="text-xs text-slate-500 mb-2">Select which paid residential listing tiers this code applies to.</p>
            <div className="flex flex-wrap gap-3">
              {TIER_OPTIONS.map(tier => (
                <label key={tier} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={(form.applies_to_tiers || []).includes(tier)}
                    onCheckedChange={() => toggleTier(tier)}
                  />
                  <span className="text-sm capitalize font-medium text-slate-700">{tier}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* Optional geographic restriction */}
          <Section title="Promotion Area Restriction">
            <GeoPromoSection
              form={form}
              onChange={(k, v) => set(k, v)}
            />
          </Section>


        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#006168] hover:bg-[#004d52] text-white">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : existingPromo?.id ? "Save Changes" : "Create Code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-[#2C4F4E] border-b border-slate-100 pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {children}
    </div>
  );
}