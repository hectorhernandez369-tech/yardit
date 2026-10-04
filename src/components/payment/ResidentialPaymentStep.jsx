import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ReviewPayContent from "@/components/payment/ReviewPayContent";
import PromoCodeInput from "@/components/payment/PromoCodeInput";
import useFounderMembership from "@/components/founder/useFounderMembership";

export default function ResidentialPaymentStep({
  tier,
  amount,
  listing,
  isDemoMode,
  isProcessing,
  errorMessage,
  retryPayment = false,
  onBack,
  onPay,
  user,
  purchaseName,
  priceBreakdown,
  summaryItems,
  benefits,
  promoEnabled = true,
  requireNonRefundAcknowledgement,
  initialPromoResult = null,
}) {
  const [promoResult, setPromoResult] = useState(initialPromoResult);
  const { isVip, isLoading: loadingVip, isError: vipError } = useFounderMembership(user?.id);
  const founderVip = isVip && !listing?.assisted_listing && ['yard_sale', 'event'].includes(listing?.listingType);

  React.useEffect(() => {
    setPromoResult(initialPromoResult || null);
  }, [initialPromoResult]);

  const handlePromoApplied = (result) => {
    setPromoResult(result || null);
  };

  // amount is in cents from CreateListing; convert to dollars for display
  const amountDollars = founderVip ? 0 : amount / 100;
  const finalAmount = founderVip ? 0 : promoResult ? promoResult.finalAmount : amount;
  const continueLabel = finalAmount === 0
    ? "Create Listing — $0"
    : retryPayment
      ? "Retry Payment"
      : "Continue to Stripe";

  // Build promoResult in dollar terms for display
  const promoResultForDisplay = promoResult ? {
    ...promoResult,
    discountAmount: promoResult.discountAmount / 100,
    finalAmount: promoResult.finalAmount / 100,
  } : null;

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardContent className="p-0">
        <ReviewPayContent
          listing={listing}
          tier={tier}
          purchaseName={purchaseName}
          price={amountDollars}
          summaryItems={founderVip ? summaryItems?.map(item => ['Base Price', 'Total'].includes(item.label) ? { ...item, value: '$0.00 · Founder VIP' } : item) : summaryItems}
          benefits={benefits}
          isDemoMode={isDemoMode}
          isProcessing={isProcessing || loadingVip || vipError}
          errorMessage={vipError ? 'Could not check your account benefits. Please reload before continuing.' : errorMessage}
          onBack={onBack}
          onPay={({ nonRefundAcknowledgement } = {}) => onPay({ promoResult: founderVip ? null : promoResult, finalAmount, nonRefundAcknowledgement })}
          promoResult={founderVip ? null : promoResultForDisplay}
          continueLabel={continueLabel}
          requireNonRefundAcknowledgement={founderVip ? false : (requireNonRefundAcknowledgement ?? listing?.listingType !== "event")}
          promoInputSlot={founderVip ? <p className="text-sm text-muted-foreground">Founder VIP: every tier and add-on is included. No payment required.</p> : promoEnabled ? (
            <PromoCodeInput
              user={user}
              listing={listing}
              selectedTier={tier}
              listingPrice={amount}
              onPromoApplied={handlePromoApplied}
              initialCode={listing?.discovery_promo_code || ""}
            />
          ) : null}
        />
      </CardContent>
    </Card>
  );
}