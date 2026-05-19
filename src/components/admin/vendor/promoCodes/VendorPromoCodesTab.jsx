import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { Tag, Plus, Pencil, Power, PowerOff } from "lucide-react";
import VendorPromoCodeModal from "./VendorPromoCodeModal";

const TIER_LABELS = {
  starter: "Starter",
  pro: "Pro",
  growth: "Growth",
  event_organizer: "Event Organizer",
};

const DISCOUNT_TYPE_LABELS = {
  percentage: "% Off",
  fixed_amount: "$ Off",
  free_trial: "Free Trial",
  custom: "Custom",
};

function discountSummary(code) {
  if (code.discount_type === "percentage") return `${code.discount_value}% off`;
  if (code.discount_type === "fixed_amount") return `$${code.discount_value} off`;
  if (code.discount_type === "free_trial") return `${code.discount_value} days free`;
  return "Custom";
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
        admin_id: user?.id,
        admin_email: user?.email,
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

  const handleEdit = (code) => {
    setEditingCode(code);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingCode(null);
    setShowModal(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["vendorPromoCodes"] });
  };

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
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No promo codes found</p>
          <p className="text-sm mt-1">Click "Create Promo Code" to add one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Eligible Tiers</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(code => {
                const expired = code.valid_end_date && isPast(new Date(code.valid_end_date));
                return (
                  <tr key={code.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-[#2C4F4E]">{code.code}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{code.promo_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[11px]">
                        {discountSummary(code)}
                      </Badge>
                      <div className="text-[10px] text-slate-400 mt-0.5">{DISCOUNT_TYPE_LABELS[code.discount_type]}</div>
                    </td>
                    <td className="px-4 py-3">
                      {code.applies_to_tiers && code.applies_to_tiers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {code.applies_to_tiers.map(t => (
                            <Badge key={t} className="text-[10px] bg-slate-100 text-slate-600">{TIER_LABELS[t] || t}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">All tiers</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <span className="font-semibold">{code.redemptions_used || 0}</span>
                      {code.max_redemptions != null ? ` / ${code.max_redemptions}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {code.valid_end_date ? (
                        <span className={expired ? "text-red-600 font-medium" : "text-slate-600"}>
                          {format(new Date(code.valid_end_date), "MMM d, yyyy")}
                          {expired && <span className="block text-[10px]">Expired</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400">No expiry</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={code.active ? "bg-green-100 text-green-800 border-green-200" : "bg-slate-100 text-slate-500"}>
                        {code.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(code)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-[#2C4F4E] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(code)}
                          className={`p-1.5 rounded transition-colors ${code.active ? "hover:bg-red-50 text-slate-400 hover:text-red-600" : "hover:bg-green-50 text-slate-400 hover:text-green-600"}`}
                          title={code.active ? "Deactivate" : "Activate"}
                        >
                          {code.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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