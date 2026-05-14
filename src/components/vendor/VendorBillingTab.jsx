import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Users, MapPin, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { VENDOR_TIERS, VENDOR_TIER_ORDER } from "@/lib/vendorTiers";
import { getVendorTierDowngradeIssues } from "@/lib/vendorEvents";
import { getVendorUsageSnapshot } from "@/lib/vendorUsage";
import VendorAddOnsSection from "@/components/vendor/billing/VendorAddOnsSection";
import TierFeatureSummary from "@/components/vendor/TierFeatureSummary";
import VendorTierReviewPanel from "@/components/vendor/billing/VendorTierReviewPanel";
import { toast } from "sonner";

export default function VendorBillingTab({ account, onRefresh }) {
  const [changingTier, setChangingTier] = useState("");
  const [reviewTier, setReviewTier] = useState("");
  // selectedTier = tier the user clicked "Upgrade" on — holds them on this page for config
  const [selectedTier, setSelectedTier] = useState("");
  const [extraUsers, setExtraUsers] = useState(0);
  const [extraPins, setExtraPins] = useState(0);
  const configRef = useRef(null);

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

  // Scroll to config section when a tier is selected
  useEffect(() => {
    if (selectedTier && configRef.current) {
      setTimeout(() => configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedTier]);

  // Reset add-on counts when selected tier changes
  useEffect(() => {
    setExtraUsers(0);
    setExtraPins(0);
  }, [selectedTier]);

  const selectedTierConfig = selectedTier ? VENDOR_TIERS[selectedTier] : null;
  const selectedBasePrice = selectedTier ? getTierPriceAmount(selectedTier) : 0;

  const estimatedTotal = useMemo(() => {
    if (!selectedTier) return 0;
    return selectedBasePrice + extraUsers * 5 + extraPins * 10;
  }, [selectedBasePrice, extraUsers, extraPins, selectedTier]);

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
      // Downgrades proceed directly (no paid checkout needed)
      setChangingTier(tierKey);
      await base44.entities.VendorAccount.update(account.id, { vendor_tier: tierKey, subscription_status: "inactive", extra_users_count: 0, extra_pins_count: 0, setup_tier_confirmed: true, vendor_setup_status: "in_progress" });
      toast.success(`Plan changed to ${VENDOR_TIERS[tierKey].label}`);
      await onRefresh?.();
      setChangingTier("");
      return;
    }

    if (targetTierIndex > currentTierIndex && tierKey !== "free") {
      // CHANGED: Select the tier for configuration — do NOT immediately advance to review
      setSelectedTier(tierKey);
      return;
    }

    setChangingTier(tierKey);
    await base44.entities.VendorAccount.update(account.id, { vendor_tier: tierKey, subscription_status: tierKey === "free" ? "inactive" : "active", extra_users_count: 0, extra_pins_count: 0, setup_tier_confirmed: true, vendor_setup_status: "in_progress" });
    toast.success(`Plan changed to ${VENDOR_TIERS[tierKey].label}`);
    await onRefresh?.();
    setChangingTier("");
  };

  if (reviewTier) {
    return (
      <div id="vendor-tier-section" className="space-y-4">
        <VendorTierReviewPanel
          targetTierKey={reviewTier}
          currentTierKey={account?.vendor_tier || "free"}
          account={account}
          isProcessing={changingTier === reviewTier}
          onBack={() => { setReviewTier(""); setSelectedTier(reviewTier); }}
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

      {/* Tier Cards */}
      <div className="grid min-w-0 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {VENDOR_TIER_ORDER.map((key) => {
          const tier = VENDOR_TIERS[key];
          const isOrganizer = key === "event_organizer";
          const isPopular = key === "pro";
          const isCurrent = account?.vendor_tier === key;
          const isSelected = selectedTier === key;

          let cardClass = "rounded-2xl overflow-hidden ";
          if (isCurrent) {
            cardClass += isOrganizer ? "border-2 border-blue-500 bg-blue-50 shadow-md" : "border-2 border-[#F4A849] bg-[#FFF7E8] shadow-md";
          } else if (isSelected) {
            cardClass += isOrganizer ? "border-2 border-blue-600 bg-blue-50 shadow-lg ring-2 ring-blue-300" : "border-2 border-[#5DADA5] bg-[#F3E6CF]/60 shadow-lg ring-2 ring-[#5DADA5]/40";
          } else {
            cardClass += isOrganizer ? "border-2 border-blue-300 bg-gradient-to-b from-blue-50 to-white shadow-md" : isPopular ? "border-2 border-[#F4A849]/70 bg-[#FFF7E8]/70 shadow-sm" : "border-[#2C4F4E]/20 bg-white shadow-sm";
          }

          return (
            <Card key={key} className={cardClass}>
              <CardHeader className="p-3 sm:p-5 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className={isOrganizer ? "text-blue-900" : "text-[#2C4F4E]"}>{tier.label}</CardTitle>
                  <div className="flex flex-wrap gap-1">
                    {isPopular && <Badge className="bg-[#F4A849] text-[#2C4F4E]">Most Popular</Badge>}
                    {isOrganizer && <Badge className="bg-blue-600 text-white">Organizer</Badge>}
                    {isCurrent && <Badge>Current</Badge>}
                    {isSelected && !isCurrent && <Badge className="bg-[#5DADA5] text-white">Selected</Badge>}
                  </div>
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${isOrganizer ? "text-blue-900" : "text-[#2C4F4E]"}`}>{tier.price}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {key === "free" ? "Trial/casual vendor usage" : key === "starter" ? "Simple/basic vendor tools" : key === "pro" ? "Most popular for active vendors" : key === "growth" ? "Premium business growth" : "Built for recurring events"}
                </p>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0 text-xs sm:text-sm space-y-3 text-slate-700">
                <TierFeatureSummary tier={tier} compact={key !== "event_organizer"} />
                {key !== "free" && key !== "starter" && <p>Extra users: {tier.extraUserPrice} each</p>}
                {key !== "free" && key !== "starter" && <p>Extra pins: {tier.extraPinPrice} each</p>}
                {isCurrent ? (
                  <Button onClick={() => handleChangeTier(key)} variant="outline" className="w-full mt-3">
                    {account?.setup_tier_confirmed ? "Current Plan" : "Confirm This Plan"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleChangeTier(key)}
                    disabled={!!changingTier}
                    variant={isSelected ? "default" : "default"}
                    className={`w-full mt-3 ${isSelected ? (isOrganizer ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-[#5DADA5] hover:bg-[#4A9B93] text-white") : ""}`}
                  >
                    {changingTier === key ? "Updating..." : VENDOR_TIER_ORDER.indexOf(key) > currentTierIndex ? (isSelected ? `✓ ${tier.label} Selected` : `Upgrade to ${tier.label}`) : `Downgrade to ${tier.label}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Section — shown after selecting an upgrade tier */}
      {selectedTier && selectedTierConfig && (
        <div ref={configRef} className="rounded-2xl border-2 border-[#5DADA5] bg-white shadow-md overflow-hidden">
          <div className="bg-[#5DADA5] px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Configure Your Plan</p>
            <h3 className="text-lg font-bold mt-0.5">{selectedTierConfig.label} — {selectedTierConfig.price}</h3>
            <p className="text-sm text-white/80 mt-1">Customize your add-ons before proceeding to payment.</p>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Add-on controls */}
            {selectedTier !== "starter" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Extra Users */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-[#2C4F4E]" />
                    <p className="text-sm font-semibold text-[#2C4F4E]">Additional Users</p>
                    <span className="ml-auto text-xs text-slate-500">$5/user/mo</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Includes {selectedTierConfig.includedUsers} user{selectedTierConfig.includedUsers !== 1 ? "s" : ""}. Add more below.</p>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraUsers(u => Math.max(0, u - 1))} disabled={extraUsers <= 0}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="flex h-8 min-w-10 items-center justify-center rounded-full border bg-white px-3 text-sm font-bold text-[#2C4F4E]">{extraUsers}</span>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraUsers(u => u + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-slate-500">= {selectedTierConfig.includedUsers + extraUsers} total users</span>
                  </div>
                </div>

                {/* Extra Pins */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[#2C4F4E]" />
                    <p className="text-sm font-semibold text-[#2C4F4E]">Additional Pins</p>
                    <span className="ml-auto text-xs text-slate-500">$10/pin/mo</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Includes {selectedTierConfig.includedPins} pin{selectedTierConfig.includedPins !== 1 ? "s" : ""}. Add more below.</p>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraPins(p => Math.max(0, p - 1))} disabled={extraPins <= 0}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="flex h-8 min-w-10 items-center justify-center rounded-full border bg-white px-3 text-sm font-bold text-[#2C4F4E]">{extraPins}</span>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraPins(p => p + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-slate-500">= {selectedTierConfig.includedPins + extraPins} total pins</span>
                  </div>
                </div>
              </div>
            )}

            {/* Estimated Total + Continue Button */}
            <div className="rounded-2xl border border-[#F4A849]/50 bg-[#FFF7E8] p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1 space-y-1 text-sm text-slate-700">
                  <p className="font-bold text-[#2C4F4E] mb-2">Estimated Monthly Total</p>
                  <p>{selectedTierConfig.label} base: <span className="font-semibold">${selectedBasePrice.toFixed(2)}</span></p>
                  {extraUsers > 0 && <p>+ {extraUsers} extra user{extraUsers !== 1 ? "s" : ""}: <span className="font-semibold">${(extraUsers * 5).toFixed(2)}</span></p>}
                  {extraPins > 0 && <p>+ {extraPins} extra pin{extraPins !== 1 ? "s" : ""}: <span className="font-semibold">${(extraPins * 10).toFixed(2)}</span></p>}
                </div>
                <div className="shrink-0 rounded-xl bg-white border border-[#F4A849]/40 p-3 text-center min-w-36">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated Total</p>
                  <p className="text-2xl font-bold text-[#2C4F4E]">${estimatedTotal.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">/month</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="border-slate-300 text-slate-600" onClick={() => setSelectedTier("")}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold gap-2"
                onClick={() => setReviewTier(selectedTier)}
              >
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {account?.vendor_tier !== "free" && !selectedTier && <VendorAddOnsSection account={account} />}
    </div>
  );
}