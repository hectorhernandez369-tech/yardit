import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { VENDOR_TIERS, VENDOR_TIER_ORDER } from "@/lib/vendorTiers";
import VendorAddOnsSection from "@/components/vendor/billing/VendorAddOnsSection";
import TierFeatureSummary from "@/components/vendor/TierFeatureSummary";
import { toast } from "sonner";

export default function VendorBillingTab({ account, onRefresh }) {
  const [changingTier, setChangingTier] = useState("");
  const currentTierIndex = Math.max(0, VENDOR_TIER_ORDER.indexOf(account?.vendor_tier || "free"));

  const handleChangeTier = async (tierKey) => {
    if (!account?.id) return;
    if (tierKey === account.vendor_tier) {
      await base44.entities.VendorAccount.update(account.id, { vendor_tier_confirmed: true, vendor_setup_status: "in_progress" });
      toast.success(`${VENDOR_TIERS[tierKey].label} plan confirmed`);
      await onRefresh?.();
      return;
    }
    setChangingTier(tierKey);
    await base44.entities.VendorAccount.update(account.id, { vendor_tier: tierKey, vendor_tier_confirmed: true, vendor_setup_status: "in_progress" });
    toast.success(`Plan changed to ${VENDOR_TIERS[tierKey].label}`);
    await onRefresh?.();
    setChangingTier("");
  };

  return (
    <div id="vendor-tier-section" className="space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-bold">Event types explained</p>
        <p><strong>Single Event:</strong> One location event such as a pop-up, sale, or vendor setup.</p>
        <p><strong>Multi-Field Event:</strong> Large organized event with multiple internal locations or fields.</p>
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
              <Button onClick={() => handleChangeTier(key)} variant="outline" className="w-full mt-3">{account?.vendor_tier_confirmed ? "Current Plan" : "Confirm This Plan"}</Button>
            ) : (
              <Button onClick={() => handleChangeTier(key)} disabled={!!changingTier} className="w-full mt-3">
                {changingTier === key ? "Updating..." : VENDOR_TIER_ORDER.indexOf(key) > currentTierIndex ? `Upgrade to ${tier.label}` : `Downgrade to ${tier.label}`}
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