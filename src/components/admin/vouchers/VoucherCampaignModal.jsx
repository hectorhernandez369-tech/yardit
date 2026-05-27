import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import VendorPickerSearch from "./VendorPickerSearch";
import { Store, Building2 } from "lucide-react";

const TRIGGER_TYPES = [
  { group: "🏠 Lister", items: [
    "first_free_listing", "first_featured_listing", "first_premium_listing",
    "first_weekend_listing", "completed_listing", "hosted_x_listings",
    "hosted_x_featured", "hosted_x_premium", "consecutive_weekends",
  ]},
  { group: "🔍 Hunter", items: [
    "saved_x_hunt_map", "checked_into_x_listings", "completed_x_routes",
    "checked_into_featured", "checked_into_premium",
    "completed_neighborhood_sale_route", "hunt_streak",
  ]},
  { group: "🎯 Engagement", items: [
    "referral", "social_share", "hidden_reward", "milestone_reward",
  ]},
];

const DEFAULT_FORM = {
  campaign_name: "", internal_notes: "", public_description: "", terms_and_conditions: "",
  redemption_instructions: "", reward_title: "", reward_type: "discount", reward_value: "",
  business_name: "", promo_prefix: "YH", distribution_limit: "", redemption_limit_per_user: 1,
  activation_delay_hours: 0, auto_hold_on_report: true, verified_business_only: false,
  redemption_radius_feet: "", geographic_scope_type: "global", geographic_scope_values: "",
  start_date: "", end_date: "", status: "draft",
  business_link_type: null,
  vendor_id: null, vendor_business_name: null, vendor_page_url: null, vendor_logo: null,
  vendor_description: null, vendor_address: null,
  external_business_name: "", external_business_logo: "", external_business_description: "",
  external_business_address: "", external_business_phone: "", external_business_website: "",
};

export default function VoucherCampaignModal({ open, onClose, editRecord, adminUser }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [triggers, setTriggers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editRecord) {
      setForm({
        ...DEFAULT_FORM,
        ...editRecord,
        geographic_scope_values: (editRecord.geographic_scope_values || []).join(", "),
        start_date: editRecord.start_date ? editRecord.start_date.substring(0, 10) : "",
        end_date: editRecord.end_date ? editRecord.end_date.substring(0, 10) : "",
        distribution_limit: editRecord.distribution_limit ?? "",
        redemption_radius_feet: editRecord.redemption_radius_feet ?? "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editRecord, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.campaign_name || !form.reward_title) {
      toast.error("Campaign name and reward title are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        geographic_scope_values: form.geographic_scope_values
          ? form.geographic_scope_values.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        distribution_limit: form.distribution_limit ? Number(form.distribution_limit) : null,
        redemption_radius_feet: form.redemption_radius_feet ? Number(form.redemption_radius_feet) : null,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        created_by: adminUser?.email || "",
        created_at: editRecord?.created_at || new Date().toISOString(),
      };
      if (editRecord) {
        await base44.entities.VoucherCampaign.update(editRecord.id, payload);
        toast.success("Campaign updated.");
      } else {
        await base44.entities.VoucherCampaign.create({ ...payload, issued_count: 0 });
        toast.success("Campaign created.");
      }
      onClose(true);
    } catch (e) {
      toast.error("Save failed: " + e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#2C4F4E] text-lg font-bold">
            {editRecord ? "Edit Campaign" : "New Voucher Campaign"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Campaign Name *</Label>
              <Input value={form.campaign_name} onChange={e => set("campaign_name", e.target.value)} placeholder="e.g. Lindsay Launch Weekend" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Reward Title *</Label>
              <Input value={form.reward_title} onChange={e => set("reward_title", e.target.value)} placeholder="e.g. Free Coffee at Brew Yard" />
            </div>
            <div className="space-y-1">
              <Label>Reward Value</Label>
              <Input value={form.reward_value} onChange={e => set("reward_value", e.target.value)} placeholder="e.g. $5 off, Free item" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Business Name</Label>
            <Input value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Partner business name" />
          </div>

          <div className="space-y-1">
            <Label>Public Description</Label>
            <Textarea rows={2} value={form.public_description} onChange={e => set("public_description", e.target.value)} placeholder="What the user sees..." />
          </div>

          <div className="space-y-1">
            <Label>Redemption Instructions</Label>
            <Textarea rows={2} value={form.redemption_instructions} onChange={e => set("redemption_instructions", e.target.value)} placeholder="Show QR code to cashier..." />
          </div>

          <div className="space-y-1">
            <Label>Terms & Conditions</Label>
            <Textarea rows={2} value={form.terms_and_conditions} onChange={e => set("terms_and_conditions", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Promo Prefix</Label>
              <Input value={form.promo_prefix} onChange={e => set("promo_prefix", e.target.value)} placeholder="YH" maxLength={5} />
            </div>
            <div className="space-y-1">
              <Label>Distribution Limit</Label>
              <Input type="number" value={form.distribution_limit} onChange={e => set("distribution_limit", e.target.value)} placeholder="Unlimited" />
            </div>
            <div className="space-y-1">
              <Label>Per-User Limit</Label>
              <Input type="number" value={form.redemption_limit_per_user} onChange={e => set("redemption_limit_per_user", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Activation Delay (hrs)</Label>
              <Input type="number" value={form.activation_delay_hours} onChange={e => set("activation_delay_hours", Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Geographic Scope</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.geographic_scope_type} onChange={e => set("geographic_scope_type", e.target.value)}>
                <option value="global">Global</option>
                <option value="state">State</option>
                <option value="county">County</option>
                <option value="zip">ZIP Code</option>
                <option value="town">Town</option>
                <option value="radius">Radius</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Scope Values (comma-separated)</Label>
              <Input value={form.geographic_scope_values} onChange={e => set("geographic_scope_values", e.target.value)} placeholder="e.g. CA, Lindsay, 93247" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Redemption Radius (feet, optional)</Label>
            <Input type="number" value={form.redemption_radius_feet} onChange={e => set("redemption_radius_feet", e.target.value)} placeholder="Leave blank for no restriction" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.auto_hold_on_report} onCheckedChange={v => set("auto_hold_on_report", v)} />
              <Label>Auto-hold on report</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.verified_business_only} onCheckedChange={v => set("verified_business_only", v)} />
              <Label>Verified businesses only</Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Internal Notes</Label>
            <Textarea rows={2} value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white border border-[#2C4F4E]">
              {saving ? "Saving..." : editRecord ? "Save Changes" : "Create Campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}