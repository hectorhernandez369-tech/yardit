import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ReviewPayContent from "@/components/payment/ReviewPayContent";
import PromoCodeInput from "@/components/payment/PromoCodeInput";

export default function ResidentialPaymentStep({
  tier,
  amount,
  listing,
  isDemoMode,
  isProcessing,
  errorMessage,
  onBack,
  onPay,
  user,
}) {
  const [promoResult, setPromoResult] = useState(null);

  const handlePromoApplied = (result) => {
    setPromoResult(result || null);
  };

  // amount is in cents from CreateListing; convert to dollars for display
  const amountDollars = amount / 100;
  const finalAmount = promoResult ? promoResult.finalAmount : amount;
  const continueLabel = finalAmount === 0
    ? "Complete — Free with Promo"
    : "Continue to Stripe";

  // Build promoResult in dollar terms for display
  const promoResultForDisplay = promoResult ? {
    ...promoResult,
    discountAmount: promoResult.discountAmount / 100,
    finalAmount: promoResult.finalAmount / 100,
  } : null;

  return (
    <Card className="border-0 shadow-xl bg-white/95">
      <CardContent className="p-4 sm:p-6">
        <ReviewPayContent
          listing={listing}
          tier={tier}
          price={amountDollars}
          isDemoMode={isDemoMode}
          isProcessing={isProcessing}
          errorMessage={errorMessage}
          onBack={onBack}
          onPay={() => onPay({ promoResult, finalAmount })}
          promoResult={promoResultForDisplay}
          continueLabel={continueLabel}
          promoInputSlot={
            <PromoCodeInput
              user={user}
              listing={listing}
              selectedTier={tier}
              listingPrice={amount}
              onPromoApplied={handlePromoApplied}
            />
          }
        />
      </CardContent>
    </Card>
  );
}