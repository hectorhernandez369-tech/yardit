import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { Tag, Plus, Pencil, Power, PowerOff, Star, MapPin } from "lucide-react";
import VendorPromoCodeModal from "./VendorPromoCodeModal";
import PromoRedemptionsPanel from "./PromoRedemptionsPanel";

const TIER_LABELS = {
  starter: "Starter", pro: "Pro", growth: "Growth", event_organizer: "Event Organizer",
};

const DISCOUNT_TYPE_LABELS = {
  percentage: "% Off", fixed_amount: "$ Off", free_trial: "Free Trial", custom: "Custom",
};

function discountSummary(code) {
  if (code.discount_type === "percentage") return `${code.discount_value}% off`;
  if (code.discount_type === "fixed_amount") return `$${code.discount_value} off`;
  if (code.discount_type === "free_trial") return `${code.discount_value} days free`;
  return "Custom";
}

function durationSummary(code) {
  if (code.promotion_duration_type === "preset_days" && code.promotion_duration_days) return `${code.promotion_duration_days}d benefit`;
  if (code.promotion_duration_type === "fixed_end_date" && code.promotion_end_date) return `Until ${format(new Date(code.promotion_end_date), "MMM d, yyyy")}`;
  return "No expiry";
}

function geoSummary(code) {
  if (!code.geographic_limit_enabled) return null;
  const t = code.geographic_limit_type;
  if (!t || t === "none") return null;
  if (t === "city_zip") {
    const parts = [];
    if (code.geo_display_label) return code.geo_display_label;
    if (code.eligible_cities?.length) parts.push(code.eligible_cities.join(", "));
    if (code.eligible_zips?.length) parts.push(code.eligible_zips.join(", "));
    return parts.join(" / ") || "City/ZIP restricted";
  }
  if (t === "radius") {
    const label = code.geo_display_label ? `from ${code.geo_display_label}` : "";
    return `${code.geo_radius_miles || "?"}-mile radius ${label}`.trim();
  }
  return null;
}

export default function VendorPromoCodesTab({ user }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["vendorPromoCodes"],
    queryFn: () => base44.entities.VendorPromoCode.list("-created_at"),
  });

  const filtered = codes.filter(c => {
    if (statusFilter === "active") return c.active;
    if (statusFilter === "inactive") return !c.active;
    return true;
  });

  const handleToggleActive = async (code) => {
    const newActive = !code.active;
    const label = newActive ? "activated" : "deactivated";
    if (!window.confirm(`${newActive ? "Activate" : "Deactivate"} promo code "${code.code}"?`)) return;
    try {
      await base44.entities.VendorPromoCode.update(code.id, { active: newActive, updated_at: new Date().toISOString() });
      await base44.entities.AdminAuditLog.create({
        admin_id: user?.id, admin_email: user?.email,
        action_type: `vendor_promo_code_${label}`,
        target_entity_type: "VendorPromoCode",
        target_entity_id: code.id,
        description: `${label.charAt(0).toUpperCase() + label.slice(1)} promo code "${code.code}".`,
      }).catch(() => {});
      toast.success(`Promo code ${label}`);
      queryClient.invalidateQueries({ queryKey: ["vendorPromoCodes"] });
    } catch {
      toast.error("Failed to update promo code");
    }
  };

  const handleEdit = (code) => { setEditingCode(code); setShowModal(true); };
  const handleCreate = () => { setEditingCode(null); setShowModal(true); };
  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ["vendorPromoCodes"] });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading promo codes...</div>;

  return (
    <div className="mt-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#5DADA5]" />
          <span className="font-bold text-[#2C4F4E]">Vendor Promo Codes</span>
          <Badge className="bg-[#F3E6CF] text-[#2C4F4E] border border-[#F4A849]/40">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleCreate} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Create Promo Code
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No promo codes found</p>
          <p className="text-sm mt-1">Click "Create Promo Code" to add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(code => {
            const currentCount = code.current_redemptions ?? code.redemptions_used ?? 0;
            const max = code.max_redemptions;
            const pct = max != null ? Math.min(100, (currentCount / max) * 100) : null;
            const redeemExpired = (code.redeem_by_date || code.valid_end_date) && isPast(new Date(code.redeem_by_date || code.valid_end_date));

            return (
              <div key={code.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[#2C4F4E] text-base">{code.code}</span>
                      {code.is_founding_vendor && (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] gap-1"><Star className="w-2.5 h-2.5" />Founding</Badge>
                      )}
                      <Badge className={code.active ? "bg-green-100 text-green-800 border-green-200 text-[10px]" : "bg-slate-100 text-slate-500 text-[10px]"}>
                        {code.active ? "Active" : "Inactive"}
                      </Badge>
                      {redeemExpired && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Redeem Closed</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{code.promo_name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleEdit(code)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-[#2C4F4E] transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleActive(code)} className={`p-1.5 rounded transition-colors ${code.active ? "hover:bg-red-50 text-slate-400 hover:text-red-600" : "hover:bg-green-50 text-slate-400 hover:text-green-600"}`} title={code.active ? "Deactivate" : "Activate"}>
                      {code.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Details row */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200">{discountSummary(code)}</Badge>
                  <Badge className="bg-slate-100 text-slate-600">{durationSummary(code)}</Badge>
                  {code.applies_to_tiers?.length > 0
                    ? code.applies_to_tiers.map(t => <Badge key={t} className="bg-slate-100 text-slate-600 text-[10px]">{TIER_LABELS[t] || t}</Badge>)
                    : <Badge className="bg-slate-100 text-slate-400 text-[10px]">All tiers</Badge>
                  }
                  {geoSummary(code) && (
                    <Badge className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] gap-1">
                      <MapPin className="w-2.5 h-2.5" />{geoSummary(code)}
                    </Badge>
                  )}
                  {code.redeem_by_date && (
                    <span className={`text-[10px] font-medium ${redeemExpired ? "text-red-600" : "text-slate-500"}`}>
                      Redeem by {format(new Date(code.redeem_by_date), "MMM d, yyyy")}
                    </span>
                  )}
                </div>

                {/* Usage bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Redemptions</span>
                    <span className="font-bold text-slate-700">
                      {max != null ? `${currentCount} / ${max}` : <span>{currentCount} <span className="text-slate-400 font-normal">/ Unlimited</span></span>}
                    </span>
                  </div>
                  {max != null && (
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-[#5DADA5]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {code.allow_slot_recovery && <p className="text-[10px] text-slate-400">Slot recovery enabled</p>}
                </div>

                {/* Founding vendor info */}
                {code.is_founding_vendor && code.founding_recurring_price != null && (
                  <div className="text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-amber-800">
                    After trial: <strong>${code.founding_recurring_price}/mo</strong> locked rate
                    {code.founding_forfeits_on_cancel && " · Forfeited on cancel"}
                  </div>
                )}

                {/* Redemptions panel */}
                <PromoRedemptionsPanel promoCode={code} user={user} />
              </div>
            );
          })}
        </div>
      )}

      <VendorPromoCodeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        existingCode={editingCode}
        user={user}
        onSaved={handleSaved}
      />
    </div>
  );
}