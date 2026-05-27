import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, isPast } from "date-fns";
import { Gift, MapPin, Clock, AlertCircle, CheckCircle2, ShieldAlert, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_INFO = {
  redeemed: {
    title: "Already Redeemed",
    description: "This reward has already been used and cannot be redeemed again.",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: CheckCircle2,
  },
  on_hold: {
    title: "Reward On Hold",
    description: "This reward has been temporarily paused while we review activity. Please check back soon.",
    color: "text-amber-700",
    bg: "bg-amber-50",
    icon: ShieldAlert,
  },
  revoked: {
    title: "Reward Revoked",
    description: "This reward is no longer valid.",
    color: "text-red-700",
    bg: "bg-red-50",
    icon: AlertCircle,
  },
  expired: {
    title: "Reward Expired",
    description: "This reward has passed its expiration date.",
    color: "text-slate-500",
    bg: "bg-slate-50",
    icon: Clock,
  },
  pending: {
    title: "Reward Not Yet Active",
    description: "This reward is pending activation. Please check back after your listing event completes.",
    color: "text-blue-700",
    bg: "bg-blue-50",
    icon: Clock,
  },
};

export default function RewardRedeem() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const userLocation = useRef(null);

  useEffect(() => {
    if (!token) { setError("No reward token found."); setLoading(false); return; }
    loadVoucher();
  }, [token]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { userLocation.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {}
      );
    }
  }, []);

  const loadVoucher = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getVoucherByToken", { token });
      const data = res.data;
      setVoucher(data.voucher);
      setCampaign(data.campaign);
    } catch (e) {
      setError(e?.response?.data?.error || "Reward not found.");
    }
    setLoading(false);
  };

  const handleConfirmRedeem = async () => {
    setRedeeming(true);
    try {
      await base44.functions.invoke("redeemVoucher", {
        token,
        user_lat: userLocation.current?.lat,
        user_lng: userLocation.current?.lng,
        device_info: navigator.userAgent,
      });
      setRedeemed(true);
      setShowConfirm(false);
      setVoucher(v => ({ ...v, status: "redeemed", redeemed_at: new Date().toISOString() }));
      toast.success("🎉 Reward redeemed successfully!");
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || "Redemption failed.";
      if (e?.response?.data?.outside_radius) {
        setLocationError("Redemption unavailable at this location. Please visit the partner business.");
      } else {
        toast.error(msg);
      }
      setShowConfirm(false);
    }
    setRedeeming(false);
  };

  const copyCode = () => {
    if (voucher?.promo_code) {
      navigator.clipboard.writeText(voucher.promo_code);
      toast.success("Promo code copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2C4F4E] via-[#5DADA5] to-[#3a6b6a] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 mx-auto animate-spin mb-3" />
          <p className="text-lg font-medium">Loading your reward...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2C4F4E] to-[#5DADA5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Reward Not Found</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const isBlockedStatus = ["redeemed", "on_hold", "revoked", "expired", "pending"].includes(voucher?.status);
  const statusInfo = STATUS_INFO[voucher?.status];
  const isExpired = voucher?.expiration_date && isPast(new Date(voucher.expiration_date));
  const isRedeemedState = redeemed || voucher?.status === "redeemed";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a3535] via-[#2C4F4E] to-[#5DADA5]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {campaign?.campaign_image ? (
          <div className="relative h-48 sm:h-64">
            <img src={campaign.campaign_image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#2C4F4E]/80" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-r from-[#F4A849] to-[#e8973a] flex items-center justify-center">
            <Gift className="w-16 h-16 text-white/40" />
          </div>
        )}
      </div>

      <div className="px-4 pb-16 -mt-8 relative z-10 max-w-lg mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Yardit Brand Header */}
          <div className="bg-gradient-to-r from-[#2C4F4E] to-[#5DADA5] p-4 flex items-center gap-3">
            <div className="bg-[#F4A849] rounded-full p-2">
              <Gift className="w-5 h-5 text-[#2C4F4E]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Yardit Treasure Reward</p>
              <p className="text-white/70 text-xs">You've unlocked a reward!</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Business + Reward */}
            <div className="text-center">
              {voucher?.business_name && (
                <p className="text-sm font-medium text-[#5DADA5] mb-1">{voucher.business_name}</p>
              )}
              <h1 className="text-2xl font-bold text-[#2C4F4E]">{voucher?.reward_title}</h1>
              {campaign?.reward_value && (
                <div className="inline-block mt-2 px-4 py-1.5 bg-[#F4A849]/20 border border-[#F4A849] rounded-full">
                  <span className="text-[#c27c1a] font-bold text-lg">{campaign.reward_value}</span>
                </div>
              )}
            </div>

            {/* Status Block */}
            {isBlockedStatus && statusInfo && !isRedeemedState && (
              <div className={`rounded-xl p-4 flex items-start gap-3 ${statusInfo.bg}`}>
                <statusInfo.icon className={`w-5 h-5 mt-0.5 shrink-0 ${statusInfo.color}`} />
                <div>
                  <p className={`font-semibold ${statusInfo.color}`}>{statusInfo.title}</p>
                  <p className={`text-sm mt-0.5 ${statusInfo.color} opacity-80`}>{statusInfo.description}</p>
                </div>
              </div>
            )}

            {/* Redeemed State */}
            {isRedeemedState && (
              <div className="rounded-xl border-2 border-slate-300 p-6 relative overflow-hidden text-center">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <span className="text-5xl font-black text-slate-200 rotate-[-30deg] tracking-widest opacity-80">REDEEMED</span>
                </div>
                <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto mb-2 relative z-10" />
                <p className="font-bold text-slate-500 text-lg relative z-10">Already Redeemed</p>
                {voucher?.redeemed_at && (
                  <p className="text-xs text-slate-400 mt-1 relative z-10">
                    Redeemed {format(new Date(voucher.redeemed_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {campaign?.public_description && (
              <p className="text-slate-600 text-sm leading-relaxed">{campaign.public_description}</p>
            )}

            {/* QR Code */}
            {voucher?.qr_image_url && (
              <div className="flex flex-col items-center gap-3">
                <div className={`relative ${isRedeemedState ? "opacity-40 grayscale" : ""}`}>
                  <img src={voucher.qr_image_url} alt="QR Code" className="w-48 h-48 rounded-xl border-4 border-[#5DADA5]/30" />
                  {isRedeemedState && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-black text-red-500/80 rotate-[-30deg] bg-white/70 px-3 py-1 rounded">REDEEMED</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 text-center">Scan or show this QR code at the partner business</p>
              </div>
            )}

            {/* Promo Code */}
            {voucher?.promo_code && (
              <div className="flex items-center gap-2 bg-[#F3E6CF] border-2 border-dashed border-[#F4A849] rounded-xl px-4 py-3 justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Promo Code</p>
                  <p className="font-mono font-bold text-xl text-[#2C4F4E] tracking-widest">{voucher.promo_code}</p>
                </div>
                <button onClick={copyCode} className="p-2 hover:bg-[#F4A849]/20 rounded-lg transition-colors">
                  <Copy className="w-5 h-5 text-[#F4A849]" />
                </button>
              </div>
            )}

            {/* Expiration */}
            {voucher?.expiration_date && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {isPast(new Date(voucher.expiration_date))
                    ? `Expired ${format(new Date(voucher.expiration_date), "MMM d, yyyy")}`
                    : `Valid until ${format(new Date(voucher.expiration_date), "MMM d, yyyy")}`
                  }
                </span>
              </div>
            )}

            {/* Redemption Instructions */}
            {campaign?.redemption_instructions && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">How to Redeem</p>
                <p className="text-sm text-slate-700">{campaign.redemption_instructions}</p>
              </div>
            )}

            {/* Location Error */}
            {locationError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{locationError}</p>
              </div>
            )}

            {/* Redeem Button */}
            {!isRedeemedState && !isBlockedStatus && (
              <Button
                onClick={() => setShowConfirm(true)}
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-[#F4A849] to-[#e8973a] hover:from-[#e8973a] hover:to-[#d4882e] text-[#2C4F4E] border-2 border-[#2C4F4E] shadow-lg rounded-xl gap-2"
              >
                <Gift className="w-5 h-5" />
                Redeem My Reward
              </Button>
            )}

            {/* Terms */}
            {campaign?.terms_and_conditions && (
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-600 font-medium">Terms & Conditions</summary>
                <p className="mt-2 leading-relaxed">{campaign.terms_and_conditions}</p>
              </details>
            )}
          </div>
        </div>

        {/* Footer branding */}
        <p className="text-center text-white/50 text-xs mt-6">Powered by Yardit · Treasure Hunt Rewards</p>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-[#2C4F4E] text-center">Confirm Redemption</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-[#F4A849]/20 rounded-full flex items-center justify-center mx-auto">
              <Gift className="w-7 h-7 text-[#F4A849]" />
            </div>
            <div>
              <p className="font-bold text-[#2C4F4E] text-lg">{voucher?.reward_title}</p>
              {campaign?.reward_value && <p className="text-[#5DADA5] font-semibold">{campaign.reward_value}</p>}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-800 font-medium">⚠️ This reward cannot be used again after redemption.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93] text-white border border-[#2C4F4E] gap-2"
              >
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {redeeming ? "Redeeming..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}