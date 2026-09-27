import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

const UPGRADE_CHECKOUT_KEY = "yardit_listing_upgrade_checkout_v1";

export default function CreateListingUpgradeReturn() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your upgrade...");
  const [isLoading, setIsLoading] = useState(true);
  const [storedCheckout, setStoredCheckout] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (handledRef.current) return;
      handledRef.current = true;

      const params = new URLSearchParams(window.location.search);
      const paymentState = params.get("payment");
      const sessionId = params.get("session_id");
      const raw = localStorage.getItem(UPGRADE_CHECKOUT_KEY);

      if (!raw) {
        setMessage("Upgrade session not found.");
        setIsLoading(false);
        return;
      }

      const stored = JSON.parse(raw);
      setStoredCheckout(stored);

      if (paymentState === "cancel") {
        setMessage(stored.purchaseType === "event_add_on"
          ? "Payment was canceled. Your event add-ons were not applied. Tap Retry Payment to reopen Stripe."
          : "Payment was canceled. Your listing was not upgraded. Tap Retry Payment to reopen Stripe.");
        setIsLoading(false);
        return;
      }

      if (paymentState !== "success" || !sessionId) {
        setMessage("Upgrade confirmation is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const verifyResponse = await base44.functions.invoke("createListingUpgradeCheckout", {
          action: "verify",
          session_id: sessionId,
        });

        if (!verifyResponse?.data?.paid) {
          throw new Error(verifyResponse?.data?.pending_webhook ? "Payment received. Final confirmation is still processing — please check My Listings shortly." : "Payment could not be confirmed.");
        }

        localStorage.removeItem(UPGRADE_CHECKOUT_KEY);
        toast.success(stored.purchaseType === "event_add_on" ? "Event add-ons confirmed." : "Upgrade confirmed.");
        navigate(createPageUrl("MyListings"));
      } catch (error) {
        setMessage(error?.response?.data?.error || error?.message || "Upgrade failed.");
        setIsLoading(false);
      }
    };

    verify();
  }, [navigate]);

  const retryPayment = async () => {
    if (!storedCheckout?.checkoutRequest) {
      navigate(createPageUrl("MyListings"));
      return;
    }

    setIsRetrying(true);
    try {
      if (storedCheckout.sessionId) {
        try {
          const verifyResponse = await base44.functions.invoke("createListingUpgradeCheckout", {
            action: "verify",
            session_id: storedCheckout.sessionId,
          });
          if (verifyResponse?.data?.paid) {
            localStorage.removeItem(UPGRADE_CHECKOUT_KEY);
            toast.success(storedCheckout.purchaseType === "event_add_on" ? "Event add-ons confirmed." : "Upgrade confirmed.");
            navigate(createPageUrl("MyListings"));
            return;
          }
        } catch {}
      }

      const response = await base44.functions.invoke("createListingUpgradeCheckout", storedCheckout.checkoutRequest);
      const checkoutUrl = response?.data?.checkoutUrl;
      const sessionId = response?.data?.sessionId || "";
      if (!checkoutUrl) throw new Error("Checkout could not restart.");

      const nextStored = { ...storedCheckout, sessionId };
      localStorage.setItem(UPGRADE_CHECKOUT_KEY, JSON.stringify(nextStored));
      setStoredCheckout(nextStored);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setMessage(error?.response?.data?.error || error?.message || "Checkout could not restart.");
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          {isLoading && <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-600" />}
          <p className="text-slate-700">{message}</p>
          {!isLoading && (
            <div className="grid gap-2">
              {storedCheckout?.checkoutRequest && (
                <Button onClick={retryPayment} disabled={isRetrying} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {isRetrying ? "Opening Stripe..." : "Retry Payment"}
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate(createPageUrl("MyListings"))}>
                Back to My Listings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}