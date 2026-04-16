import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getListingCurrentTier, getTierLabel, getUpgradeOptions, getUpgradePriceDifference } from "@/lib/listingUpgradeConfig";

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

  const handleConfirmUpgrade = async () => {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Current Tier</p>
                <p className="font-semibold text-slate-900">{getTierLabel(listing, currentTier)}</p>
              </div>

              <div>
                <Label className="mb-2 block">Upgrade To</Label>
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

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Charge Today</p>
                <p className="font-semibold text-slate-900">{formatMoney(amountDue)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <CreditCard className="w-4 h-4" />
                <p className="font-semibold">Saved Payment Method</p>
              </div>
              {isRefreshingPaymentMethod ? (
                <p className="text-sm text-slate-500">Checking saved card...</p>
              ) : savedPaymentMethod ? (
                <p className="text-sm text-slate-700">
                  {savedPaymentMethod.brand} ending in {savedPaymentMethod.last4}
                </p>
              ) : (
                <p className="text-sm text-slate-500">No saved card found. You can add one in checkout.</p>
              )}
              <p className="text-xs text-slate-500">Your card is never charged without your confirmation.</p>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isStartingPayment} className="flex-1">
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmUpgrade} disabled={!selectedTier || amountDue <= 0 || isStartingPayment} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
              {isStartingPayment ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</> : `Confirm Upgrade ${formatMoney(amountDue)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}