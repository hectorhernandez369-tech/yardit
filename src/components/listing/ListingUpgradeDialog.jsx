import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import useFounderMembership from '@/components/founder/useFounderMembership';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ReviewPayContent from "@/components/payment/ReviewPayContent";
import DemoPaymentSkipDialog from "@/components/shared/DemoPaymentSkipDialog";
import { useAppMode } from "@/components/shared/DemoMode";
import { getListingCurrentTier, getUpgradeOptions, getUpgradePriceDifference } from "@/lib/listingUpgradeConfig";

const UPGRADE_CHECKOUT_KEY = "yardit_listing_upgrade_checkout_v1";

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

export default function ListingUpgradeDialog({ open, onClose, listing, user, onSuccess }) {
  const [selectedTier, setSelectedTier] = useState("");
  const queryClient = useQueryClient();
  const { isVip, isLoading: loadingVip, isError: vipError } = useFounderMembership(user?.id);
  const founderVip = isVip && listing?.ownerUserId === user?.id && !listing?.assisted_listing && !listing?.created_by_admin && ['yard_sale', 'event'].includes(listing?.listingType);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isRefreshingPaymentMethod, setIsRefreshingPaymentMethod] = useState(false);
  const [savedPaymentMethod, setSavedPaymentMethod] = useState(null);
  const [demoUpgradeRequest, setDemoUpgradeRequest] = useState(null);
  const { isDemoMode } = useAppMode();

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

  const handleConfirmUpgrade = async ({ nonRefundAcknowledgement } = {}, skipDemoPrompt = false) => {
    if (!listing || !selectedTier || amountDue <= 0) return;

    if (isDemoMode && !founderVip && !skipDemoPrompt) {
      setDemoUpgradeRequest({ nonRefundAcknowledgement });
      return;
    }

    if (!founderVip && window.self !== window.top) {
      toast.error("Checkout works only from the published app.");
      return;
    }

    try {
      setIsStartingPayment(true);
      const returnUrl = `${window.location.origin}/CreateListingUpgradeReturn`;
      const checkoutRequest = {
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
      };
      localStorage.setItem(UPGRADE_CHECKOUT_KEY, JSON.stringify({
        listingId: listing.id,
        targetTier: selectedTier,
        purchaseType: "listing_upgrade",
        checkoutRequest,
      }));

      const response = await base44.functions.invoke("createListingUpgradeCheckout", checkoutRequest);
      if (response?.data?.founder_vip) {
        localStorage.removeItem(UPGRADE_CHECKOUT_KEY);
        await queryClient.invalidateQueries();
        setIsStartingPayment(false);
        toast.success('Founder VIP upgrade activated. No charge.');
        onSuccess?.(); onClose?.();
        return;
      }
      const checkoutUrl = response?.data?.checkoutUrl;
      const sessionId = response?.data?.sessionId || "";
      localStorage.setItem(UPGRADE_CHECKOUT_KEY, JSON.stringify({
        listingId: listing.id,
        targetTier: selectedTier,
        purchaseType: "listing_upgrade",
        checkoutRequest,
        sessionId,
      }));
      if (!checkoutUrl) {
        throw new Error("Upgrade checkout could not start.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Upgrade checkout could not start.");
      setIsStartingPayment(false);
    }
  };

  const handleDemoUpgradeSkip = async () => {
    if (!listing || !selectedTier || amountDue <= 0) return;
    try {
      setIsStartingPayment(true);
      await base44.functions.invoke("createListingUpgradeCheckout", {
        action: "demo_skip_upgrade",
        listing_id: listing.id,
        target_tier: selectedTier,
        listing_kind: listing.listingType === "event" ? "event" : "residential",
        amount_cents: amountDue,
      });
      toast.success("Demo payment skipped. Upgrade applied.");
      setDemoUpgradeRequest(null);
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.message || "Demo upgrade could not be applied.");
    } finally {
      setIsStartingPayment(false);
    }
  };

  const handleDemoUpgradeContinue = () => {
    const request = demoUpgradeRequest;
    setDemoUpgradeRequest(null);
    handleConfirmUpgrade({ nonRefundAcknowledgement: request?.nonRefundAcknowledgement }, true);
  };

  return (
    <>
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
            price={founderVip ? 0 : amountDue / 100}
            continueLabel={founderVip ? 'Activate Upgrade — $0' : undefined}
            listing={listing}
            summaryTitle="Upgrade Summary"
            summaryItems={[
              { label: "Current Tier", value: currentTier?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) },
              { label: "Upgraded Tier", value: selectedTier?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) },
              { label: "Amount Due Today", value: founderVip ? '$0.00 · Founder VIP' : formatMoney(amountDue) },
            ]}
            isProcessing={isStartingPayment || loadingVip || vipError}
            errorMessage={vipError ? 'Could not check your account benefits. Please reload.' : ''}
            onBack={onClose}
            onPay={handleConfirmUpgrade}
            requireNonRefundAcknowledgement={!founderVip && listing?.listingType !== "event"}
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
    <DemoPaymentSkipDialog
      open={!!demoUpgradeRequest}
      onOpenChange={(nextOpen) => !nextOpen && setDemoUpgradeRequest(null)}
      onSkip={handleDemoUpgradeSkip}
      onContinue={handleDemoUpgradeContinue}
      isProcessing={isStartingPayment}
    />
    </>
  );
}