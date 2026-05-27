import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

function money(v) { return `$${Number(v || 0).toFixed(2)}`; }
function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  voided: "bg-gray-100 text-gray-500",
};

export default function ResidentialPromoUsageModal({ open, onClose, promo }) {
  const { data: redemptions = [], isLoading } = useQuery({
    queryKey: ["promoRedemptions", promo?.id],
    queryFn: () => base44.entities.ResidentialPromoRedemption.filter({ promo_code_id: promo.id }, "-redeemed_at", 200),
    enabled: !!promo?.id && open,
  });

  const completed = redemptions.filter(r => r.status === "completed");
  const early = completed.filter(r => r.discount_bucket === "early");
  const defaultBucket = completed.filter(r => r.discount_bucket === "default");
  const totalDiscount = completed.reduce((sum, r) => sum + (r.discount_amount || 0), 0);

  const earlyRemaining = promo?.early_discount_enabled
    ? Math.max(0, (promo.early_discount_limit || 0) - (promo.early_discount_used_count || 0))
    : null;
  const totalRemaining = promo?.max_total_uses != null
    ? Math.max(0, promo.max_total_uses - (promo.total_used_count || 0))
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#2C4F4E]">
            Promo Usage — <span className="font-mono">{promo?.code}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          <StatCard label="Total Uses" value={promo?.total_used_count || 0} />
          <StatCard label="Early Uses" value={early.length} color="text-[#006168]" />
          <StatCard label="Default Uses" value={defaultBucket.length} />
          <StatCard label="Total Discount" value={money(totalDiscount)} color="text-red-600" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {earlyRemaining !== null && <StatCard label="Early Slots Remaining" value={earlyRemaining} color="text-amber-600" />}
          {totalRemaining !== null && <StatCard label="Total Uses Remaining" value={totalRemaining} color="text-slate-600" />}
        </div>

        {/* Redemptions table */}
        <div className="mt-4">
          <h3 className="text-sm font-bold text-[#2C4F4E] mb-3">Redemptions</h3>
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-sm">Loading redemptions...</div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No redemptions yet.</div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-[#F3E6CF]/60 text-[#2C4F4E]">
                    <tr>
                      {["Date", "User", "Bucket", "Original", "Discount%", "Discount $", "Final", "Location", "Status"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {redemptions.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.redeemed_at)}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate">{r.user_email || r.user_id}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.discount_bucket === "early" ? "bg-[#006168]/10 text-[#006168]" : "bg-slate-100 text-slate-600"}`}>
                            {r.discount_bucket}
                          </span>
                        </td>
                        <td className="px-3 py-2">{money(r.original_amount)}</td>
                        <td className="px-3 py-2">{r.discount_percent_applied}%</td>
                        <td className="px-3 py-2 text-red-600">-{money(r.discount_amount)}</td>
                        <td className="px-3 py-2 font-semibold">{money(r.final_amount)}</td>
                        <td className="px-3 py-2 text-slate-500">{[r.location_city, r.location_state, r.location_zip].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge className={`text-[10px] border-0 ${STATUS_COLORS[r.status] || ""}`}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="sm:hidden space-y-2">
                {redemptions.map((r) => (
                  <div key={r.id} className="bg-white rounded-lg border border-slate-200 p-3 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-700">{r.user_email || r.user_id}</span>
                      <Badge className={`text-[10px] border-0 ${STATUS_COLORS[r.status] || ""}`}>{r.status}</Badge>
                    </div>
                    <div className="text-slate-500 mb-1">{formatDate(r.redeemed_at)}</div>
                    <div className="flex gap-3 text-slate-600">
                      <span>{money(r.original_amount)} → {money(r.final_amount)}</span>
                      <span className="text-red-500">-{money(r.discount_amount)} ({r.discount_percent_applied}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, color = "text-slate-800" }) {
  return (
    <div className="bg-[#F3E6CF]/40 rounded-xl p-3 border border-slate-200">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}