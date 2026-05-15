import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Zap, X, Clock } from "lucide-react";

const PROMO_TYPE_LABELS = {
  percentage_discount: "% Discount",
  free_events: "Free Events",
  free_checkins: "Free Check-ins",
  bonus_pins: "Bonus Pins",
  tier_comp: "Tier Comp",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
  canceled: "bg-red-100 text-red-700 border-red-200",
  fully_used: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function VendorActivePromos({ vendorAccountId, user }) {
  const queryClient = useQueryClient();

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ["vendorPromos", vendorAccountId],
    queryFn: () => base44.entities.VendorPromotion.filter({ vendor_account_id: vendorAccountId }),
    enabled: !!vendorAccountId,
  });

  const activePromos = promos.filter(p => p.status === "active");
  const inactivePromos = promos.filter(p => p.status !== "active");

  const handleCancel = async (promo) => {
    if (!window.confirm(`Cancel promo "${promo.promo_description || promo.promo_type}"?`)) return;
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
      queryClient.invalidateQueries({ queryKey: ["vendorPromos", vendorAccountId] });
    } catch {
      toast.error("Failed to cancel promotion");
    }
  };

  if (isLoading) return null;
  if (promos.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {activePromos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Active Promotions
          </p>
          {activePromos.map(promo => {
            const isExpired = promo.end_date && isPast(new Date(promo.end_date));
            const isCountBased = ["free_events", "free_checkins", "bonus_pins"].includes(promo.promo_type);
            const remaining = isCountBased ? (promo.granted_count || 0) - (promo.used_count || 0) : null;

            return (
              <div key={promo.id} className="flex items-start justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">
                      {PROMO_TYPE_LABELS[promo.promo_type] || promo.promo_type}
                    </Badge>
                    {isExpired && <Badge className="bg-red-100 text-red-700 text-[10px]">Expired</Badge>}
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate">{promo.promo_description || summaryText(promo)}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {promo.end_date && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {isPast(new Date(promo.end_date))
                          ? `Expired ${formatDistanceToNow(new Date(promo.end_date))} ago`
                          : `Expires ${formatDistanceToNow(new Date(promo.end_date), { addSuffix: true })}`}
                      </span>
                    )}
                    {remaining !== null && (
                      <span>{remaining} remaining of {promo.granted_count}</span>
                    )}
                    <span>By {promo.created_by_admin_name || "admin"}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(promo)}
                  className="shrink-0 p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                  title="Cancel promotion"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {inactivePromos.length > 0 && (
        <details className="text-xs">
          <summary className="text-slate-400 cursor-pointer hover:text-slate-600 select-none">
            {inactivePromos.length} past promotion(s)
          </summary>
          <div className="mt-1 space-y-1">
            {inactivePromos.map(promo => (
              <div key={promo.id} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                <Badge className={`text-[10px] border ${STATUS_COLORS[promo.status]}`}>{promo.status}</Badge>
                <span className="text-slate-500 truncate">{promo.promo_description || promo.promo_type}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function summaryText(promo) {
  if (promo.promo_type === "percentage_discount") return `${promo.promo_value}% discount`;
  if (promo.promo_type === "free_events") return `${promo.promo_value} free event(s)`;
  if (promo.promo_type === "free_checkins") return `${promo.promo_value} free check-in(s)`;
  if (promo.promo_type === "bonus_pins") return `+${promo.promo_value} bonus pin(s)`;
  if (promo.promo_type === "tier_comp") return `${promo.promo_tier} tier comp`;
  return "Promotion";
}