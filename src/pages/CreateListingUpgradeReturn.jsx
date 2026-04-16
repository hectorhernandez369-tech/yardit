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

      if (paymentState === "cancel") {
        localStorage.removeItem(UPGRADE_CHECKOUT_KEY);
        setMessage("Upgrade canceled.");
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
          throw new Error("Payment could not be confirmed.");
        }

        await base44.functions.invoke("applyListingUpgrade", {
          listing_id: stored.listingId,
          target_tier: stored.targetTier,
        });

        localStorage.removeItem(UPGRADE_CHECKOUT_KEY);
        toast.success("Upgrade complete.");
        navigate(createPageUrl("MyListings"));
      } catch (error) {
        setMessage(error?.response?.data?.error || error?.message || "Upgrade failed.");
        setIsLoading(false);
      }
    };

    verify();
  }, [navigate]);

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          {isLoading && <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-600" />}
          <p className="text-slate-700">{message}</p>
          {!isLoading && (
            <Button onClick={() => navigate(createPageUrl("MyListings"))} className="bg-amber-600 hover:bg-amber-700 text-white">
              Back to My Listings
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}