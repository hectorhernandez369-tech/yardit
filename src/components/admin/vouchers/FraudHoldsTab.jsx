import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";

const STATUS_COLORS = {
  open: "bg-red-100 text-red-800",
  investigating: "bg-amber-100 text-amber-800",
  cleared: "bg-green-100 text-green-800",
  revoked: "bg-slate-100 text-slate-600",
};

export default function FraudHoldsTab({ adminUser }) {
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["voucherFraudReviews"],
    queryFn: () => base44.entities.VoucherFraudReview.list("-created_at"),
    initialData: [],
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ["allUserVouchers"],
    queryFn: () => base44.entities.UserVoucher.list(),
    initialData: [],
  });

  const voucherMap = Object.fromEntries(vouchers.map(v => [v.id, v]));

  const updateReview = async (reviewId, voucherId, status, disposition) => {
    await base44.entities.VoucherFraudReview.update(reviewId, {
      status,
      disposition,
      resolved_at: new Date().toISOString(),
    });
    if (status === "cleared") {
      await base44.functions.invoke("adminVoucherAction", { voucher_id: voucherId, action: "clear_hold" });
    } else if (status === "revoked") {
      await base44.functions.invoke("adminVoucherAction", { voucher_id: voucherId, action: "revoke", reason: "Fraud confirmed" });
    }
    toast.success(`Review marked ${status}.`);
    queryClient.invalidateQueries({ queryKey: ["voucherFraudReviews", "allUserVouchers"] });
  };

  const openReviews = reviews.filter(r => r.status === "open" || r.status === "investigating");
  const closedReviews = reviews.filter(r => r.status === "cleared" || r.status === "revoked");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#2C4F4E] flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" />Fraud Holds</h2>
        <p className="text-sm text-slate-500">Vouchers currently held due to reports or suspicious activity.</p>
      </div>

      {isLoading && <p className="text-center text-slate-400 text-sm py-8">Loading...</p>}

      {/* On-Hold Vouchers */}
      {!isLoading && (
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Active Reviews ({openReviews.length})</h3>
          {openReviews.length === 0 ? (
            <Card className="border-dashed border-slate-200">
              <CardContent className="p-8 text-center text-slate-400">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No active fraud reviews. All clear!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {openReviews.map(r => {
                const v = voucherMap[r.voucher_id];
                return (
                  <Card key={r.id} className="border border-amber-200 bg-amber-50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#2C4F4E]">{v?.reward_title || "Unknown Reward"}</p>
                          <p className="font-mono text-xs text-slate-500">{v?.promo_code}</p>
                          <p className="text-xs text-slate-500 mt-1">{r.reason}</p>
                        </div>
                        <Badge className={`text-xs ${STATUS_COLORS[r.status] || ""}`}>{r.status}</Badge>
                      </div>
                      {r.created_at && <p className="text-xs text-slate-400">Reported: {format(new Date(r.created_at), "MMM d, yyyy")}</p>}
                      {r.admin_notes && <p className="text-xs text-slate-600 bg-white rounded p-2">Notes: {r.admin_notes}</p>}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200">
                        <Button size="sm" onClick={() => updateReview(r.id, r.voucher_id, "investigating", "Under investigation")}
                          variant="outline" className="text-xs h-7 border-amber-400 text-amber-700 hover:bg-amber-100">
                          Mark Investigating
                        </Button>
                        <Button size="sm" onClick={() => updateReview(r.id, r.voucher_id, "cleared", "Cleared — unfounded")}
                          className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white gap-1">
                          <ShieldCheck className="w-3 h-3" />Clear & Restore
                        </Button>
                        <Button size="sm" onClick={() => updateReview(r.id, r.voucher_id, "revoked", "Fraud confirmed")}
                          variant="destructive" className="text-xs h-7 gap-1">
                          <ShieldOff className="w-3 h-3" />Confirm Fraud & Revoke
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resolved */}
      {!isLoading && closedReviews.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Resolved Reviews ({closedReviews.length})</h3>
          <div className="space-y-2">
            {closedReviews.slice(0, 20).map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-700">{voucherMap[r.voucher_id]?.promo_code || r.voucher_id}</p>
                  <p className="text-xs text-slate-400">{r.disposition}</p>
                </div>
                <Badge className={`text-xs ml-2 ${STATUS_COLORS[r.status] || ""}`}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}