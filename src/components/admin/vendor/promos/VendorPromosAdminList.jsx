import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Zap, X, Clock } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-200",
  expired: "bg-slate-100 text-slate-600",
  canceled: "bg-red-100 text-red-700",
  fully_used: "bg-blue-100 text-blue-700",
};

const PROMO_TYPE_LABELS = {
  percentage_discount: "% Discount",
  free_events: "Free Events",
  free_checkins: "Free Check-ins",
  bonus_pins: "Bonus Pins",
  tier_comp: "Tier Comp",
};

export default function VendorPromosAdminList({ user }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ["allVendorPromos"],
    queryFn: () => base44.entities.VendorPromotion.list("-created_date"),
  });

  const filtered = promos.filter(p => statusFilter === "all" ? true : p.status === statusFilter);

  const canCancel = ["master", "supervisor"].includes(user?.role || user?.role_label);

  const handleCancel = async (promo) => {
    if (!window.confirm(`Cancel promo for ${promo.business_name}?`)) return;
    try {
      await base44.entities.VendorPromotion.update(promo.id, {
        status: "canceled",
        canceled_by_admin_id: user?.id,
        canceled_at: new Date().toISOString(),
      });
      await base44.entities.AdminAuditLog.create({
        admin_id: user?.id,
        admin_email: user?.email,
        action_type: "vendor_promo_canceled",
        target_entity_type: "VendorPromotion",
        target_entity_id: promo.id,
        description: `Canceled promo "${promo.promo_description}" for ${promo.business_name}.`,
      }).catch(() => {});
      toast.success("Promotion canceled");
      queryClient.invalidateQueries({ queryKey: ["allVendorPromos"] });
    } catch {
      toast.error("Failed to cancel promotion");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading promotions...</div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-[#2C4F4E]">All Vendor Promotions</span>
          <Badge className="bg-amber-100 text-amber-800">{filtered.length}</Badge>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="fully_used">Fully Used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-lg border">No promotions found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(promo => {
            const isCountBased = ["free_events", "free_checkins", "bonus_pins"].includes(promo.promo_type);
            const remaining = isCountBased ? (promo.granted_count || 0) - (promo.used_count || 0) : null;
            const expired = promo.end_date && isPast(new Date(promo.end_date));

            return (
              <div key={promo.id} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-sm text-[#2C4F4E] truncate">{promo.business_name || "—"}</span>
                    <span className="text-xs text-slate-400">{promo.vendor_account_number}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                      {PROMO_TYPE_LABELS[promo.promo_type]}
                    </Badge>
                    <Badge className={`text-[10px] border ${STATUS_COLORS[promo.status]}`}>
                      {expired && promo.status === "active" ? "expired (active)" : promo.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">{promo.promo_description}</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
                    {promo.end_date && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {expired
                          ? `Expired ${formatDistanceToNow(new Date(promo.end_date))} ago`
                          : `Expires ${format(new Date(promo.end_date), "MMM d, yyyy")}`}
                      </span>
                    )}
                    {!promo.end_date && <span>No expiry</span>}
                    {remaining !== null && <span>{remaining} remaining of {promo.granted_count}</span>}
                    <span>By {promo.created_by_admin_name || "admin"}</span>
                  </div>
                  {promo.reason_note && (
                    <p className="text-[10px] text-slate-400 italic">Note: {promo.reason_note}</p>
                  )}
                </div>
                {canCancel && promo.status === "active" && (
                  <button
                    onClick={() => handleCancel(promo)}
                    className="shrink-0 self-start p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title="Cancel promotion"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}