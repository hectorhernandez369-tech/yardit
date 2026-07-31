import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CreditCard } from "lucide-react";

export default function NeighborhoodSetupStep({ isProcessing, errorMessage, onBack, onSetup }) {
  const [nonRefundAcknowledged, setNonRefundAcknowledged] = useState(false);
  const nonRefundDisclosure = "I understand Neighborhood Sale charges are non-refundable once Yardit charges my saved payment method after the event commitment/lock rules are met.";

  const handleSetup = () => {
    onSetup?.({
      acknowledged: nonRefundAcknowledged,
      acknowledged_at: nonRefundAcknowledged ? new Date().toISOString() : "",
      disclosure_text: nonRefundDisclosure,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Payment Method Required
        </h3>
        <p className="mb-4 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-amber-900">
          Secure card setup powered by Stripe.
        </p>
        <ul className="list-disc pl-5 space-y-3 text-amber-900 text-[15px]">
          <li><strong>Payment method required:</strong> A card must be saved on file to create a Neighborhood Sale.</li>
          <li><strong>No charge at creation:</strong> You will not be charged immediately.</li>
          <li>Your Neighborhood Sale becomes committed once 5 participating homes are approved. At that point, the organizer is financially obligated for the $49.99 flat price.</li>
          <li>If you cancel after commitment, you will be charged $49.99 at that time.</li>
          <li>If you do not cancel, your card will be charged $49.99 once at the 24-hour mark before the event.</li>
          <li>After the 24-hour charge, the event is locked and no additional homes can be added.</li>
        </ul>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 cursor-pointer">
        <Checkbox checked={nonRefundAcknowledged} onCheckedChange={(checked) => setNonRefundAcknowledged(checked === true)} className="mt-0.5" />
        <span><strong>Required:</strong> {nonRefundDisclosure}</span>
      </label>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleSetup}
          disabled={isProcessing || !nonRefundAcknowledged}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
        >
          {isProcessing ? "Starting Setup..." : "Add Payment Method"}
        </Button>
      </div>
    </div>
  );
}