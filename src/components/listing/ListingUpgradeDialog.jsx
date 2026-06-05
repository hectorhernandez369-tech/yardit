import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReviewPayContent from "@/components/payment/ReviewPayContent";
import { getListingCurrentTier, getUpgradeOptions, getUpgradePriceDifference } from "@/lib/listingUpgradeConfig";

const UPGRADE_CHECKOUT_KEY = "yardit_listing_upgrade_checkout_v1";

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

export default function ListingUpgradeDialog({ open, onClose, listing, user, onSuccess }) {
  const [selectedTier, setSelectedTier] = useState("");
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isRefreshingPaymentMethod, setIsRefreshingPaymentMethod] = useState(false);
  const [savedPaymentMethod, setSavedPaymentMethod] = useState(null);

  const upgradeOptions = useMemo(() => (listing ? getUpgradeOptions(listing) : []), [listing]);
  const currentTier = listing ? getListingCurrentTier(listing) : "";
  const amountDue = useMemo(() => {
    if (!listing || !selectedTier) return 0;
    return getUpgradePriceDifference(listing, selectedTier);
  }, [listing, selectedTier]);

  useEffect(() => {
    if (!open || !listing) return;
    setSelectedTier(upgradeOptions[0]?.value || "");
  }, [open, listing, upgradeOptions]);

  useEffect(() => {
    if (!open || !listing) return;

    const loadSavedPaymentMethod = async () => {
      if (listing.listingType === "neighborhood_sale") {
        setSavedPaymentMethod(null);
        return;
      }

      const customerId = listing.organizer_stripe_customer_id;
      if (!customerId) {
        setSavedPaymentMethod(null);
        return;
      }

      try {
        setIsRefreshingPaymentMethod(true);
        const response = await base44.functions.invoke("createListingUpgradeCheckout", {
          action: "payment_method",
          customer_id: customerId,
        });
        setSavedPaymentMethod(response?.data?.paymentMethod || null);
      } catch {
        setSavedPaymentMethod(null);
      } finally {
        setIsRefreshingPaymentMethod(false);
      }
    };

    loadSavedPaymentMethod();
  }, [open, listing]);

  const handleConfirmUpgrade = async ({ nonRefundAcknowledgement } = {}) => {
    if (!listing || !selectedTier || amountDue <= 0) return;

    if (window.self !== window.top) {
      toast.error("Checkout works only from the published app.");
      return;
    }

    try {
      setIsStartingPayment(true);
      localStorage.setItem(UPGRADE_CHECKOUT_KEY, JSON.stringify({
        listingId: listing.id,
        targetTier: selectedTier,
      }));

      const returnUrl = `${window.location.origin}/CreateListingUpgradeReturn`;
      const response = await base44.functions.invoke("createListingUpgradeCheckout", {
        action: "create",
        listing_id: listing.id,
        target_tier: selectedTier,
        listing_kind: listing.listingType === "event" ? "event" : "residential",
        customer_email: user?.email,
        customer_id: listing.organizer_stripe_customer_id || undefined,
        amount_cents: amountDue,
        return_url: returnUrl,
        non_refund_acknowledged: nonRefundAcknowledgement?.acknowledged === true,
        non_refund_acknowledged_at: nonRefundAcknowledgement?.acknowledged_at || "",
        non_refund_acknowledged_by_user_id: user?.id || "",
        non_refund_disclosure_text: nonRefundAcknowledgement?.disclosure_text || "",
      });

      const checkoutUrl = response?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("Upgrade checkout could not start.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Upgrade checkout could not start.");
      setIsStartingPayment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Review & Pay</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-[#2C4F4E] font-semibold">Upgrade To</Label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select upgrade tier" />
              </SelectTrigger>
              <SelectContent>
                {upgradeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ReviewPayContent
            purchaseName="Listing Upgrade"
            badge={selectedTier ? `${selectedTier.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}` : "Upgrade"}
            purchaseType="listing_upgrade"
            tier={selectedTier}
            price={amountDue / 100}
            listing={listing}
            summaryTitle="Upgrade Summary"
            summaryItems={[
              { label: "Current Tier", value: currentTier?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) },
              { label: "Upgraded Tier", value: selectedTier?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) },
              { label: "Amount Due Today", value: formatMoney(amountDue) },
            ]}
            isProcessing={isStartingPayment}
            onBack={onClose}
            onPay={handleConfirmUpgrade}
            requireNonRefundAcknowledgement={listing?.listingType !== "event"}
          />

          {savedPaymentMethod && (
            <Card>
              <CardContent className="p-3 text-xs text-slate-500">
                Saved card: {savedPaymentMethod.brand} ending in {savedPaymentMethod.last4}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}