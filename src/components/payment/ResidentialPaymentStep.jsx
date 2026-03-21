import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, Lock } from "lucide-react";

export default function ResidentialPaymentStep({
  tier,
  amount,
  isDemoMode,
  isProcessing,
  errorMessage,
  onBack,
  onPay,
}) {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700 capitalize">{tier} Listing</p>
              <p className="text-xs text-gray-500">Payment happens before your listing is created.</p>
            </div>
            <Badge className="bg-blue-600 text-white">${amount.toFixed(2)}</Badge>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {isDemoMode ? (
            <p>Demo Mode: payment is simulated and your paid listing will be created as scheduled after success.</p>
          ) : (
            <p>You'll continue to Stripe Checkout in test mode to complete payment securely.</p>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing} className="flex-1">
            Back
          </Button>
          <Button type="button" onClick={onPay} disabled={isProcessing} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {isDemoMode ? `Simulate Payment $${amount.toFixed(2)}` : `Pay $${amount.toFixed(2)}`}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}