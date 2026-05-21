import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Users, MapPin, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { VENDOR_TIERS, VENDOR_TIER_ORDER } from "@/lib/vendorTiers";
import { getVendorAccountCapabilities } from "@/lib/getVendorAccountCapabilities";
import { getVendorTierDowngradeIssues } from "@/lib/vendorEvents";
import { getVendorUsageSnapshot } from "@/lib/vendorUsage";
import TierFeatureSummary from "@/components/vendor/TierFeatureSummary";
import VendorTierReviewPanel from "@/components/vendor/billing/VendorTierReviewPanel";
import { toast } from "sonner";

const TIER_TAGLINES = {
  free: "Trial/casual vendor usage",
  starter: "Simple/basic vendor tools",
  pro: "Most popular for active vendors",
  growth: "Premium business growth",
  event_organizer: "Built for recurring events",
};

export default function VendorBillingTab({ account, onRefresh }) {
  const [changingTier, setChangingTier] = useState("");
  const [reviewTier, setReviewTier] = useState("");
  const [reviewAddOns, setReviewAddOns] = useState({ extraUsers: 0, extraPins: 0 });
  const [selectedTier, setSelectedTier] = useState("");
  const [expandedTier, setExpandedTier] = useState("");
  const [extraUsers, setExtraUsers] = useState(0);
  const [extraPins, setExtraPins] = useState(0);
  const [addOnsOpen, setAddOnsOpen] = useState(false);
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
    // Include both active and accepted users for accurate usage counting
    queryFn: () => base44.entities.VendorAuthorizedUser.filter({ vendor_account_id: account.id }),
    enabled: !!account?.id,
    initialData: [],
  });

  const usageSnapshot = getVendorUsageSnapshot({ account, events, pins, users });

  const getTierPriceAmount = (tierKey) => Number(String(VENDOR_TIERS[tierKey]?.price || "0").replace(/[^0-9.]/g, "")) || 0;

  useEffect(() => {
    if (selectedTier && configRef.current) {
      setTimeout(() => configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedTier]);

  useEffect(() => {
    setExtraUsers(0);
    setExtraPins(0);
    setAddOnsOpen(false);
  }, [selectedTier]);

  const selectedTierConfig = selectedTier ? VENDOR_TIERS[selectedTier] : null;
  const selectedBasePrice = selectedTier ? getTierPriceAmount(selectedTier) : 0;

  const estimatedTotal = useMemo(() => {
    if (!selectedTier) return 0;
    return selectedBasePrice + extraUsers * 5 + extraPins * 10;
  }, [selectedBasePrice, extraUsers, extraPins, selectedTier]);

  const startTierCheckout = async (tierKey, promoData = {}) => {
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
    const { checkoutUrl, sessionId } = response?.data || {};
    if (!checkoutUrl) throw new Error("Vendor subscription checkout could not start.");

    // Record promo redemption if a promo was applied
    const { appliedPromo, discountAmount } = promoData;
    if (appliedPromo?.id) {
      await base44.functions.invoke("recordVendorPromoRedemption", {
        promo_code_id: appliedPromo.id,
        promo_code: appliedPromo.code,
        vendor_account_id: account.id,
        tier_selected: tierKey,
        discount_type: appliedPromo.discount_type,
        discount_value: appliedPromo.discount_value,
        discount_applied_dollars: discountAmount || 0,
        checkout_session_id: sessionId || null,
      }).catch(() => {});
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
      setChangingTier(tierKey);
      await base44.entities.VendorAccount.update(account.id, { vendor_tier: tierKey, subscription_status: "inactive", extra_users_count: 0, extra_pins_count: 0, setup_tier_confirmed: true, vendor_setup_status: "in_progress" });
      toast.success(`Plan changed to ${VENDOR_TIERS[tierKey].label}`);
      await onRefresh?.();
      setChangingTier("");
      return;
    }
    if (targetTierIndex > currentTierIndex && tierKey !== "free") {
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
          extraUsers={reviewAddOns.extraUsers}
          extraPins={reviewAddOns.extraPins}
          isProcessing={changingTier === reviewTier}
          onBack={() => { setReviewTier(""); setSelectedTier(reviewTier); setExtraUsers(reviewAddOns.extraUsers); setExtraPins(reviewAddOns.extraPins); }}
          onPay={(promoData) => startTierCheckout(reviewTier, promoData)}
        />
      </div>
    );
  }

  return (
    <div id="vendor-tier-section" className="space-y-4">


      {/* Collapsed Tier Cards */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">Choose a Plan</p>
        {VENDOR_TIER_ORDER.map((key) => {
          const tier = VENDOR_TIERS[key];
          const isOrganizer = key === "event_organizer";
          const isPopular = key === "pro";
          const isCurrent = account?.vendor_tier === key;
          const isSelected = selectedTier === key;
          const isExpanded = expandedTier === key;
          const isUpgrade = VENDOR_TIER_ORDER.indexOf(key) > currentTierIndex;
          const isDowngrade = VENDOR_TIER_ORDER.indexOf(key) < currentTierIndex;

          let borderClass = "border border-[#2C4F4E]/15";
          if (isCurrent) borderClass = isOrganizer ? "border-2 border-blue-500" : "border-2 border-[#F4A849]";
          else if (isSelected) borderClass = "border-2 border-[#5DADA5] ring-2 ring-[#5DADA5]/30";
          else if (isOrganizer) borderClass = "border-2 border-blue-300";
          else if (isPopular) borderClass = "border-2 border-[#F4A849]/60";

          let bgClass = "bg-white";
          if (isCurrent) bgClass = isOrganizer ? "bg-blue-50" : "bg-[#FFF7E8]";
          else if (isSelected) bgClass = "bg-[#F3E6CF]/50";
          else if (isOrganizer) bgClass = "bg-gradient-to-r from-blue-50 to-white";

          return (
            <Card key={key} className={`rounded-2xl ${borderClass} ${bgClass} shadow-sm overflow-hidden`}>
              {/* Collapsed header — always visible */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedTier(isExpanded ? "" : key)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-bold text-sm ${isOrganizer ? "text-blue-900" : "text-[#2C4F4E]"}`}>{tier.label}</span>
                    {isPopular && <Badge className="bg-[#F4A849] text-[#2C4F4E] text-[10px] px-1.5 py-0">Popular</Badge>}
                    {isOrganizer && <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">Organizer</Badge>}
                    {isCurrent && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Current</Badge>}
                    {isSelected && !isCurrent && <Badge className="bg-[#5DADA5] text-white text-[10px] px-1.5 py-0">Selected</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span className={`font-semibold text-sm ${isOrganizer ? "text-blue-800" : "text-[#2C4F4E]"}`}>{tier.price}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{TIER_TAGLINES[key]}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{tier.includedUsers} user{tier.includedUsers !== 1 ? "s" : ""} included</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{tier.includedPins} pin{tier.includedPins !== 1 ? "s" : ""} included</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 text-sm text-slate-700 space-y-3 border-t border-slate-100">
                  <TierFeatureSummary tier={tier} compact={key !== "event_organizer"} />
                  {key !== "free" && key !== "starter" && (
                    <p className="text-xs text-slate-500">Extra users: {tier.extraUserPrice} each · Extra pins: {tier.extraPinPrice} each</p>
                  )}
                  {isCurrent ? (
                    <Button onClick={() => handleChangeTier(key)} variant="outline" size="sm" className="w-full mt-1">
                      {account?.setup_tier_confirmed ? "Current Plan" : "Confirm This Plan"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => { handleChangeTier(key); setExpandedTier(""); }}
                      disabled={!!changingTier}
                      size="sm"
                      className={`w-full mt-1 ${isSelected ? "bg-[#5DADA5] hover:bg-[#4A9B93] text-white" : ""}`}
                    >
                      {changingTier === key ? "Updating..." : isUpgrade ? (isSelected ? `✓ ${tier.label} Selected` : `Upgrade to ${tier.label}`) : `Downgrade to ${tier.label}`}
                    </Button>
                  )}
                </CardContent>
              )}
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
            <p className="text-sm text-white/80 mt-1">Optionally add extra users or pins before proceeding to payment.</p>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Included summary */}
            <div className="flex gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {selectedTierConfig.includedUsers} user{selectedTierConfig.includedUsers !== 1 ? "s" : ""} included</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedTierConfig.includedPins} pin{selectedTierConfig.includedPins !== 1 ? "s" : ""} included</span>
            </div>

            {/* Collapsible Add-ons */}
            {selectedTier !== "starter" && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left"
                  onClick={() => setAddOnsOpen(o => !o)}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#2C4F4E]">Add Users & Pins</p>
                    {!addOnsOpen && (extraUsers > 0 || extraPins > 0) ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {extraUsers > 0 ? `+${extraUsers} user${extraUsers !== 1 ? "s" : ""}` : ""}
                        {extraUsers > 0 && extraPins > 0 ? " · " : ""}
                        {extraPins > 0 ? `+${extraPins} pin${extraPins !== 1 ? "s" : ""}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">Add extra team members or active pins if needed.</p>
                    )}
                  </div>
                  {addOnsOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {addOnsOpen && (
                  <div className="p-4 grid gap-3 sm:grid-cols-2 border-t border-slate-100">
                    {/* Extra Users */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-[#2C4F4E]" />
                        <p className="text-sm font-semibold text-[#2C4F4E]">Additional Users</p>
                        <span className="ml-auto text-xs text-slate-400">$5/mo each</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraUsers(u => Math.max(0, u - 1))} disabled={extraUsers <= 0}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="flex h-8 min-w-10 items-center justify-center rounded-full border bg-white px-3 text-sm font-bold text-[#2C4F4E]">{extraUsers}</span>
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraUsers(u => u + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-slate-500">{selectedTierConfig.includedUsers + extraUsers} total</span>
                      </div>
                    </div>

                    {/* Extra Pins */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-[#2C4F4E]" />
                        <p className="text-sm font-semibold text-[#2C4F4E]">Additional Pins</p>
                        <span className="ml-auto text-xs text-slate-400">$10/mo each</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraPins(p => Math.max(0, p - 1))} disabled={extraPins <= 0}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="flex h-8 min-w-10 items-center justify-center rounded-full border bg-white px-3 text-sm font-bold text-[#2C4F4E]">{extraPins}</span>
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExtraPins(p => p + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-slate-500">{selectedTierConfig.includedPins + extraPins} total</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Estimated Monthly Total */}
            <div className="rounded-2xl border border-[#F4A849]/50 bg-[#FFF7E8] p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1 space-y-1 text-sm text-slate-700">
                  <p className="font-bold text-[#2C4F4E] mb-2">Estimated Monthly Total</p>
                  <p>{selectedTierConfig.label}: <span className="font-semibold">${selectedBasePrice.toFixed(2)}</span></p>
                  {extraUsers > 0 && <p>+ {extraUsers} extra user{extraUsers !== 1 ? "s" : ""}: <span className="font-semibold">${(extraUsers * 5).toFixed(2)}</span></p>}
                  {extraPins > 0 && <p>+ {extraPins} extra pin{extraPins !== 1 ? "s" : ""}: <span className="font-semibold">${(extraPins * 10).toFixed(2)}</span></p>}
                </div>
                <div className="shrink-0 rounded-xl bg-white border border-[#F4A849]/40 p-3 text-center min-w-36">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
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
                onClick={() => {
                  setReviewAddOns({ extraUsers, extraPins });
                  setReviewTier(selectedTier);
                  // Scroll to top of the section so review starts at the top
                  setTimeout(() => {
                    const el = document.getElementById("vendor-tier-section");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    else window.scrollTo({ top: 0, behavior: "smooth" });
                  }, 50);
                }}
              >
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}