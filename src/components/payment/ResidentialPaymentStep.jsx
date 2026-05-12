import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import ReviewPayContent from "@/components/payment/ReviewPayContent";

export default function ResidentialPaymentStep({
  tier,
  amount,
  listing,
  isDemoMode,
  isProcessing,
  errorMessage,
  onBack,
  onPay,
}) {
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
          onPay={onPay}
        />
      </CardContent>
    </Card>
  );
}