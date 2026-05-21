import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, isPast } from "date-fns";
import { Users, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  active:    "bg-green-100 text-green-800 border-green-200",
  expired:   "bg-slate-100 text-slate-500 border-slate-200",
  removed:   "bg-red-100 text-red-700 border-red-200",
  canceled:  "bg-orange-100 text-orange-700 border-orange-200",
  forfeited: "bg-purple-100 text-purple-700 border-purple-200",
};

function computeStatus(redemption) {
  if (redemption.redemption_status && redemption.redemption_status !== "active") return redemption.redemption_status;
  if (redemption.benefits_expire_at && isPast(new Date(redemption.benefits_expire_at))) return "expired";
  return "active";
}

export default function PromoRedemptionsPanel({ promoCode, user }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(null); // redemption to remove
  const [slotChoice, setSlotChoice] = useState(null); // true/false
  const [isRemoving, setIsRemoving] = useState(false);

  const { data: redemptions = [], isLoading } = useQuery({
    queryKey: ["promoRedemptions", promoCode.id],
    queryFn: () => base44.entities.VendorPromoRedemption.filter({ promo_code_id: promoCode.id }),
    enabled: expanded,
  });

  const handleRemove = async () => {
    if (slotChoice === null) return toast.error("Please choose whether to recover the slot.");
    setIsRemoving(true);
    try {
      await base44.functions.invoke("removeVendorPromoRedemption", {
        redemption_id: removing.id,
        recover_slot: slotChoice,
      });
      toast.success("Redemption removed" + (slotChoice ? " · slot reopened" : ""));
      queryClient.invalidateQueries({ queryKey: ["promoRedemptions", promoCode.id] });
      queryClient.invalidateQueries({ queryKey: ["vendorPromoCodes"] });
      setRemoving(null);
      setSlotChoice(null);
    } catch {
      toast.error("Failed to remove redemption");
    } finally {
      setIsRemoving(false);
    }
  };

  const currentCount = promoCode.current_redemptions ?? promoCode.redemptions_used ?? 0;
  const max = promoCode.max_redemptions;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-[#5DADA5] hover:text-[#2C4F4E] font-semibold transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        View Redemptions ({currentCount}{max != null ? ` / ${max}` : ""})
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-xs text-slate-400 text-center">Loading redemptions...</div>
          ) : redemptions.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 text-center">No redemptions yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Redeemed</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redemptions.map(r => {
                  const status = computeStatus(r);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{r.vendor_business_name || "—"}</div>
                        <div className="text-[10px] text-slate-400">{r.user_email}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.tier_selected}</td>
                      <td className="px-3 py-2 text-slate-500">{r.redeemed_at ? format(new Date(r.redeemed_at), "MMM d, yyyy") : "—"}</td>
                      <td className="px-3 py-2">
                        {r.benefits_expire_at ? (
                          <span className={isPast(new Date(r.benefits_expire_at)) ? "text-red-600" : "text-slate-500"}>
                            {format(new Date(r.benefits_expire_at), "MMM d, yyyy")}
                          </span>
                        ) : <span className="text-slate-400">Never</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] border ${STATUS_STYLES[status] || "bg-slate-100 text-slate-500"}`}>{status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {status === "active" && (
                          <button onClick={() => { setRemoving(r); setSlotChoice(null); }}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Remove">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Remove confirmation dialog */}
      <Dialog open={!!removing} onOpenChange={() => { setRemoving(null); setSlotChoice(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Promo from Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-700">
              Remove promo <span className="font-mono font-bold">{promoCode.code}</span> from <span className="font-semibold">{removing?.vendor_business_name || removing?.user_email}</span>?
            </p>
            {promoCode.allow_slot_recovery && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Should this removal reopen a redemption slot?</p>
                <div className="flex gap-2">
                  <button onClick={() => setSlotChoice(true)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${slotChoice === true ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white text-slate-700 border-slate-200 hover:border-[#2C4F4E]"}`}>
                    Yes — reopen slot
                  </button>
                  <button onClick={() => setSlotChoice(false)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${slotChoice === false ? "bg-[#2C4F4E] text-white border-[#2C4F4E]" : "bg-white text-slate-700 border-slate-200 hover:border-[#2C4F4E]"}`}>
                    No — keep count
                  </button>
                </div>
              </div>
            )}
            {!promoCode.allow_slot_recovery && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                Slot recovery is not enabled for this promo code. The redemption count will remain unchanged.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRemoving(null); setSlotChoice(null); }}>Cancel</Button>
            <Button
              onClick={handleRemove}
              disabled={isRemoving || (promoCode.allow_slot_recovery && slotChoice === null)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRemoving ? "Removing..." : "Remove Promo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}