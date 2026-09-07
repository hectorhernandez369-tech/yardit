import React from "react";
import PaymentVerificationStatus from "@/components/payment/PaymentVerificationStatus";
import usePaidCheckoutReturn from "@/hooks/usePaidCheckoutReturn";

export default function PaidCheckoutReturn() {
  const { status, message, retry } = usePaidCheckoutReturn();
  return (
    <div className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <PaymentVerificationStatus status={status} message={message} onRetry={retry} />
      </div>
    </div>
  );
}