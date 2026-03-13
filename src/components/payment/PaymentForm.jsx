import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppMode } from "@/components/shared/DemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Loader2, Lock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function PaymentForm({ amount, plan, onPaymentComplete, onCancel, isProcessing }) {
  const { isDemoMode } = useAppMode();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    name: "",
    email: "",
  });
  const [isValidating, setIsValidating] = useState(false);

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardDetails((prev) => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e) => {
    const formatted = formatExpiry(e.target.value);
    setCardDetails((prev) => ({ ...prev, expiry: formatted }));
  };

  const validateCard = () => {
    const cardNumber = cardDetails.cardNumber.replace(/\s/g, "");
    
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      toast.error("Please enter a valid card number");
      return false;
    }

    if (!cardDetails.expiry || cardDetails.expiry.length < 5) {
      toast.error("Please enter a valid expiry date");
      return false;
    }

    const [month, year] = cardDetails.expiry.split("/");
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (parseInt(month) < 1 || parseInt(month) > 12) {
      toast.error("Invalid expiry month");
      return false;
    }

    if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      toast.error("Card has expired");
      return false;
    }

    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      toast.error("Please enter a valid CVV");
      return false;
    }

    if (!cardDetails.name) {
      toast.error("Please enter cardholder name");
      return false;
    }

    if (!cardDetails.email || !cardDetails.email.includes("@")) {
      toast.error("Please enter a valid email");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCard()) {
      return;
    }

    setIsValidating(true);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsValidating(false);

    // In production, this would call your payment processor (Stripe, PayPal, etc.)
    // For now, we'll simulate a successful payment
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    toast.success("Payment successful!");
    onPaymentComplete({
      transaction_id: transactionId,
      payment_method: `${getCardType(cardDetails.cardNumber)} ending in ${cardDetails.cardNumber.slice(-4)}`,
      email: cardDetails.email,
    });
  };

  const getCardType = (number) => {
    const num = number.replace(/\s/g, "");
    if (num.startsWith("4")) return "Visa";
    if (num.startsWith("5")) return "Mastercard";
    if (num.startsWith("3")) return "Amex";
    return "Card";
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Secure Payment
        </CardTitle>
        <p className="text-white/90 text-sm mt-1">
          Your payment information is encrypted and secure
        </p>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {plan === "5_day" ? "5-Day Listing" : "30-Day Listing"}
              </span>
              <span className="text-2xl font-bold text-blue-600">${amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Secure encrypted payment processing
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <label
                htmlFor="card"
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === "card"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Credit or Debit Card</span>
              </label>
            </RadioGroup>
          </div>

          {/* Card Details Form */}
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={cardDetails.email}
                onChange={(e) =>
                  setCardDetails((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
              <p className="text-xs text-gray-500">Receipt will be sent to this email</p>
            </div>

            {/* Card Number */}
            <div className="space-y-2">
              <Label htmlFor="cardNumber">
                Card Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                  required
                />
                <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Cardholder Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Cardholder Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) =>
                  setCardDetails((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">
                  Expiry Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={handleExpiryChange}
                  maxLength={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">
                  CVV <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cvv"
                  type="password"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) =>
                    setCardDetails((prev) => ({
                      ...prev,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  maxLength={4}
                  required
                />
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Your payment is secure</p>
                <p className="text-xs">
                  We use industry-standard encryption to protect your payment information.
                  Your card details are never stored on our servers.
                </p>
              </div>
            </div>
          </div>

          {isDemoMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> This is a demonstration of the payment flow. 
                No actual charges will be made. In production, this would integrate with 
                Stripe, PayPal, or another payment processor.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Test with any card number (e.g., 4242 4242 4242 4242)
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isValidating || isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isValidating || isProcessing}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {isValidating || isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}