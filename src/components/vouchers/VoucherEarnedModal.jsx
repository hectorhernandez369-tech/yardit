import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function VoucherEarnedModal({ open, onClose, voucher, campaign }) {
  if (!voucher) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(voucher.promo_code);
    toast.success("Code copied!");
  };

  const openRedeemPage = () => {
    window.open(`/reward/redeem/${voucher.qr_token}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-4 p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2C4F4E] to-[#5DADA5] p-5 text-center text-white relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {["✨","🎉","⭐","🏆","💎"].map((e, i) => (
              <span key={i} className="absolute text-xl animate-bounce" style={{
                top: `${10 + (i * 18)}%`, left: `${5 + (i * 22)}%`,
                animationDelay: `${i * 0.2}s`, animationDuration: "1.5s"
              }}>{e}</span>
            ))}
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-[#F4A849] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Gift className="w-8 h-8 text-[#2C4F4E]" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-1">You discovered a</p>
            <h2 className="text-2xl font-black tracking-tight">Yardit Reward!</h2>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-[#F3E6CF]">
          {/* Campaign image */}
          {campaign?.campaign_image && (
            <div className="rounded-xl overflow-hidden h-28">
              <img src={campaign.campaign_image} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Reward Info */}
          <div className="text-center">
            {voucher.business_name && <p className="text-sm text-[#5DADA5] font-medium">{voucher.business_name}</p>}
            <p className="text-xl font-bold text-[#2C4F4E] mt-1">{voucher.reward_title}</p>
            {campaign?.reward_value && (
              <div className="inline-block mt-2 px-4 py-1 bg-[#F4A849]/30 border border-[#F4A849] rounded-full">
                <span className="text-[#c27c1a] font-bold">{campaign.reward_value}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          {voucher.qr_image_url && (
            <div className="flex justify-center">
              <img src={voucher.qr_image_url} alt="QR" className="w-36 h-36 rounded-xl border-4 border-white shadow-md" />
            </div>
          )}

          {/* Promo Code */}
          <div className="flex items-center gap-2 bg-white border-2 border-dashed border-[#F4A849] rounded-xl px-4 py-3 justify-between">
            <div>
              <p className="text-xs text-slate-400">Promo Code</p>
              <p className="font-mono font-bold text-[#2C4F4E] tracking-widest text-lg">{voucher.promo_code}</p>
            </div>
            <button onClick={copyCode} className="p-1.5 hover:bg-[#F4A849]/20 rounded-lg">
              <Copy className="w-4 h-4 text-[#F4A849]" />
            </button>
          </div>

          {/* Expiry */}
          {voucher.expiration_date && (
            <p className="text-center text-xs text-slate-500">
              Valid until {format(new Date(voucher.expiration_date), "MMMM d, yyyy")}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-[#2C4F4E] text-[#2C4F4E] text-sm" onClick={onClose}>
              Close
            </Button>
            <Button onClick={openRedeemPage} className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93] text-white border border-[#2C4F4E] text-sm gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              View Reward
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}