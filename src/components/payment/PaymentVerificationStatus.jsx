import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentVerificationStatus({ status, message, onRetry }) {
  const isProcessing = status === "processing";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      {isProcessing ? (
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#006168]" />
      ) : (
        <AlertTriangle className="mx-auto h-9 w-9 text-amber-600" />
      )}
      <h2 className="mt-4 text-xl font-bold text-slate-800">
        {isProcessing ? "Finishing your listing" : "Payment verification needs attention"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {message || (isProcessing ? "Your payment was received. Yardit is verifying it with Stripe now." : "Your payment may have completed, but Yardit could not finish your listing yet. Do not pay again.")}
      </p>
      {!isProcessing && (
        <Button type="button" onClick={onRetry} className="mt-5 bg-[#006168] text-white hover:bg-[#004d52]">
          Retry Payment Verification
        </Button>
      )}
    </div>
  );
}