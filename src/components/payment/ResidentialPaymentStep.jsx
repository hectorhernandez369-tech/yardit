import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import ReviewPayContent from "@/components/payment/ReviewPayContent";
import PromoCodeInput from "@/components/payment/PromoCodeInput";

function money(v) { return `$${Number(v || 0).toFixed(2)}`; }

export default function ResidentialPaymentStep({
  tier,
  amount,
  listing,
  isDemoMode,
  isProcessing,
  errorMessage,
  onBack,
  onPay,
  userId,
}) {
  const [promoResult, setPromoResult] = useState(null);

  const originalAmount = amount;
  const discountAmount = promoResult?.valid ? promoResult.discountAmount : 0;
  const finalAmount = promoResult?.valid ? promoResult.finalAmount : originalAmount;
  const isFree = finalAmount <= 0;

  const listingLocation = {
    state: listing?.state || "",
    county: listing?.county || "",
    city: listing?.city || "",
    town: listing?.city || "",
    zip: listing?.zip || "",
  };

  const handlePay = () => {
    onPay(promoResult?.valid ? { promoResult, finalAmount, isFree } : null);
  };

  // If free after promo, show a special confirm button instead of Stripe
  if (isDemoMode) {
    return (
      <Card className="border-0 shadow-xl bg-white/95">
        <CardContent className="p-4 sm:p-6">
          <ReviewPayContent
            listing={listing}
            tier={tier}
            price={amount}
            isDemoMode={isDemoMode}
            isProcessing={isProcessing}
            errorMessage={errorMessage}
            onBack={onBack}
            onPay={() => onPay(null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-white/95">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#5DADA5] to-[#2C4F4E] p-4 text-white shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Review & Pay</p>
              <h2 className="mt-1 text-xl font-bold capitalize">{tier} Listing</h2>
            </div>
            <div className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-right">
              <p className="text-xs text-white/75">Original</p>
              <p className="font-bold">{money(originalAmount)}</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
        )}

        {/* Promo Code Input */}
        <PromoCodeInput
          userId={userId}
          listingLocation={listingLocation}
          selectedTier={tier}
          listingPriceCents={Math.round(originalAmount * 100)}
          onPromoApplied={setPromoResult}
        />

        {/* Pricing summary when promo applied */}
        {promoResult?.valid && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Original Price</span>
              <span>{money(originalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-700 font-medium">
              <span>Promo Discount ({promoResult.discountPercent}% off)</span>
              <span>-{money(discountAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-green-200">
              <span>Total Due</span>
              <span className={isFree ? "text-green-700" : ""}>{isFree ? "FREE" : money(finalAmount)}</span>
            </div>
          </div>
        )}

        {isFree && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>100% discount applied — no payment required!</span>
          </div>
        )}

        {!isFree && (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <CreditCard className="h-4 w-4 shrink-0 text-[#2C4F4E]" />
              <span>Secure checkout powered by Stripe.</span>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Paid access activates only after Stripe confirms payment.</span>
            </div>
          </>
        )}

        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing} className="border-[#2C4F4E] text-[#2C4F4E]">
            Back
          </Button>
          <Button type="button" onClick={handlePay} disabled={isProcessing} className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold">
            {isProcessing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              : isFree ? "Confirm Free Listing 🎉" : `Continue to Stripe — ${money(finalAmount)}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}