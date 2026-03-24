import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";

export default function NeighborhoodSetupStep({ isProcessing, errorMessage, onBack, onSetup }) {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Payment Method Required
        </h3>
        <ul className="list-disc pl-5 space-y-3 text-amber-900 text-[15px]">
          <li><strong>Neighborhood Sales require a payment method on file.</strong></li>
          <li>You will <strong>not be charged at creation.</strong></li>
          <li>Once your sale reaches 5 participants, your event is considered committed.</li>
          <li>Your payment will be charged at the 24-hour mark before the event, or immediately if you cancel after commitment.</li>
          <li>After activation, no additional homes can be added.</li>
        </ul>
      </div>

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
          onClick={onSetup}
          disabled={isProcessing}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
        >
          {isProcessing ? "Starting Setup..." : "Add Payment Method"}
        </Button>
      </div>
    </div>
  );
}