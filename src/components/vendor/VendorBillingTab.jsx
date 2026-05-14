import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { VENDOR_TIERS, VENDOR_TIER_ORDER } from "@/lib/vendorTiers";
import { getVendorTierDowngradeIssues } from "@/lib/vendorEvents";
import { getVendorUsageSnapshot } from "@/lib/vendorUsage";
import VendorAddOnsSection from "@/components/vendor/billing/VendorAddOnsSection";
import TierFeatureSummary from "@/components/vendor/TierFeatureSummary";
import VendorTierReviewPanel from "@/components/vendor/billing/VendorTierReviewPanel";
import UpgradeAddOnsStep from "@/components/vendor/billing/UpgradeAddOnsStep";
import { toast } from "sonner";

export default function VendorBillingTab({ account, onRefresh }) {
  const [changingTier, setChangingTier] = useState("");
  const [reviewTier, setReviewTier] = useState("");
  const [addOnsTier, setAddOnsTier] = useState(""); // intermediate add-ons step
  const [pendingAddOns, setPendingAddOns] = useState({ extraUsers: 0, extraPins: 0 });
  const currentTierIndex = Math.max(0, VENDOR_TIER_ORDER.indexOf(account?.vendor_tier || "free"));

  const { data: events = [] } = useQuery({
    queryKey: ["vendorBillingEvents", account?.id],
    queryFn: () => base44.entities.VendorEvent.filter({ organizer_business_id: account.id }),
    enabled: !!account?.id,
    initialData: [],
  });

  const { data: pins = [] } = useQuery({
    queryKey: ["vendorBillingPins", account?.id],
    queryFn: () => base44.entities.VendorPin.filter({ vendor_account_id: account.id }),
    enabled: !!account?.id,
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["vendorBillingUsers", account?.id],
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id, status: "active" }),
    enabled: !!account?.id,
    initialData: [],
  });

  const usageSnapshot = getVendorUsageSnapshot({ account, events, pins, users });

  const getTierPriceAmount = (tierKey) => Number(String(VENDOR_TIERS[tierKey]?.price || "0").replace(/[^0-9.]/g, "")) || 0;

  const startTierCheckout = async (tierKey) => {
    setReviewTier("");
    setChangingTier(tierKey);

    if (window.self !== window.top) {
      toast.error("Checkout works only from the published app.");
      setChangingTier("");
      return;
    }

    const response = await base44.functions.invoke("createVendorSubscriptionCheckout", {
      vendor_account_id: account.id,
      target_tier: tierKey,
      return_url: `${window.location.origin}/VendorDashboard?tab=tier`,
    });

    const checkoutUrl = response?.data?.checkoutUrl;
    if (!checkoutUrl) {
      throw new Error("Vendor subscription checkout could not start.");
    }

    window.location.assign(checkoutUrl);
  };

  const handleChangeTier = async (tierKey) => {
    if (!account?.id) return;
    if (tierKey === account.vendor_tier) {
      await base44.entities.VendorAccount.update(account.id, { setup_tier_confirmed: true, vendor_setup_status: "in_progress" });
      toast.success(`${VENDOR_TIERS[tierKey].label} plan confirmed`);
      await onRefresh?.();
      return;
    }
    const targetTierIndex = VENDOR_TIER_ORDER.indexOf(tierKey);
    if (targetTierIndex < currentTierIndex) {
      const downgradeCheck = getVendorTierDowngradeIssues({ account, events, targetTierKey: tierKey, activePins: pins, activeUsers: users });
      if (!downgradeCheck.allowed) {
        toast.error(`Cannot downgrade yet: ${downgradeCheck.issues.join(" ")}`);
        return;
      }
    }

    if (targetTierIndex > currentTierIndex && tierKey !== "free") {
      setAddOnsTier(tierKey); // show add-ons step first
      return;
    }

    setChangingTier(tierKey);

    await base44.entities.VendorAccount.update(account.id, { vendor_tier: tierKey, subscription_status: tierKey === "free" ? "inactive" : "active", extra_users_count: 0, extra_pins_count: 0, setup_tier_confirmed: true, vendor_setup_status: "in_progress" });
    toast.success(`Plan changed to ${VENDOR_TIERS[tierKey].label}`);
    await onRefresh?.();
    setChangingTier("");
  };

  if (addOnsTier) {
    return (
      <div id="vendor-tier-section" className="space-y-4">
        <UpgradeAddOnsStep
          targetTierKey={addOnsTier}
          onBack={() => setAddOnsTier("")}
          onContinue={(addOns) => {
            setPendingAddOns(addOns);
            setReviewTier(addOnsTier);
            setAddOnsTier("");
          }}
        />
      </div>
    );
  }

  if (reviewTier) {
    return (
      <div id="vendor-tier-section" className="space-y-4">
        <VendorTierReviewPanel
          targetTierKey={reviewTier}
          currentTierKey={account?.vendor_tier || "free"}
          account={account}
          pendingAddOns={pendingAddOns}
          isProcessing={changingTier === reviewTier}
          onBack={() => { setReviewTier(""); setAddOnsTier(reviewTier); }}
          onPay={() => startTierCheckout(reviewTier)}
        />
      </div>
    );
  }

  return (
    <div id="vendor-tier-section" className="space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-bold">Event types explained</p>
        <p><strong>Single Event:</strong> One location event such as a pop-up, sale, or vendor setup.</p>
        <p><strong>Multi-Field Event:</strong> Large organized event with multiple internal locations or fields.</p>
      </div>

      <div className="grid gap-2 rounded-2xl border border-[#2C4F4E]/10 bg-white p-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-5">
        <p><strong>{usageSnapshot.used.singleEvents} / {usageSnapshot.allowed.singleEvents}</strong> Single Events Used</p>
        <p><strong>{usageSnapshot.used.multiSpotEvents} / {usageSnapshot.allowed.multiSpotEvents}</strong> Multi-Spot Events Used</p>
        <p><strong>{usageSnapshot.used.multiLocationEvents} / {usageSnapshot.allowed.multiLocationEvents}</strong> Multi-Location Events Used</p>
        <p><strong>{usageSnapshot.used.pins} / {usageSnapshot.allowed.pins}</strong> Truck/Pins Used</p>
        <p><strong>{usageSnapshot.used.users} / {usageSnapshot.allowed.users}</strong> Vendor Users Used</p>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {VENDOR_TIER_ORDER.map((key) => {
        const tier = VENDOR_TIERS[key];
        const isOrganizer = key === "event_organizer";
        const isPopular = key === "pro";
        return (
        <Card key={key} className={account?.vendor_tier === key ? `rounded-2xl border-2 ${isOrganizer ? "border-blue-500 bg-blue-50" : "border-[#F4A849] bg-[#FFF7E8]"} shadow-md overflow-hidden` : `rounded-2xl ${isOrganizer ? "border-2 border-blue-300 bg-gradient-to-b from-blue-50 to-white shadow-md" : isPopular ? "border-2 border-[#F4A849]/70 bg-[#FFF7E8]/70 shadow-sm" : "border-[#2C4F4E]/20 bg-white shadow-sm"} overflow-hidden`}>
        <CardHeader className="p-3 sm:p-5 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className={isOrganizer ? "text-blue-900" : "text-[#2C4F4E]"}>{tier.label}</CardTitle>
              <div className="flex flex-wrap gap-1">
                {isPopular && <Badge className="bg-[#F4A849] text-[#2C4F4E]">Most Popular</Badge>}
                {isOrganizer && <Badge className="bg-blue-600 text-white">Organizer</Badge>}
                {account?.vendor_tier === key && <Badge>Current</Badge>}
              </div>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${isOrganizer ? "text-blue-900" : "text-[#2C4F4E]"}`}>{tier.price}</p>
            <p className="text-xs font-semibold text-slate-500">{key === "free" ? "Trial/casual vendor usage" : key === "starter" ? "Simple/basic vendor tools" : key === "pro" ? "Most popular for active vendors" : key === "growth" ? "Premium business growth" : "Built for recurring events"}</p>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0 text-xs sm:text-sm space-y-3 text-slate-700">
            <TierFeatureSummary tier={tier} compact={key !== "event_organizer"} />
            {key !== "free" && key !== "starter" && <p>Extra users: {tier.extraUserPrice} each</p>}
            {key !== "free" && key !== "starter" && <p>Extra pins: {tier.extraPinPrice} each</p>}
            {account?.vendor_tier === key ? (
              <Button onClick={() => handleChangeTier(key)} variant="outline" className="w-full mt-3">{account?.setup_tier_confirmed ? "Current Plan" : "Confirm This Plan"}</Button>
            ) : (
              <Button onClick={() => handleChangeTier(key)} disabled={!!changingTier} className="w-full mt-3">
                {changingTier === key ? "Updating..." : Math.max(0, VENDOR_TIER_ORDER.indexOf(key)) > currentTierIndex ? `Upgrade to ${tier.label}` : `Downgrade to ${tier.label}`}
              </Button>
            )}
          </CardContent>
        </Card>
      );
      })}
      </div>

      {account?.vendor_tier !== "free" && <VendorAddOnsSection account={account} />}
    </div>
  );
}