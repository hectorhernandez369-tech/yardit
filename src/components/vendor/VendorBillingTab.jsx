import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { VENDOR_TIERS } from "@/lib/vendorTiers";
import { toast } from "sonner";

const TIER_ORDER = ["starter", "pro", "growth"];

export default function VendorBillingTab({ account, onRefresh }) {
  const [changingTier, setChangingTier] = useState("");
  const currentTierIndex = TIER_ORDER.indexOf(account?.vendor_tier || "starter");

  const handleChangeTier = async (tierKey) => {
    if (!account?.id || tierKey === account.vendor_tier) return;
    setChangingTier(tierKey);
    await base44.entities.VendorAccount.update(account.id, { vendor_tier: tierKey });
    toast.success(`Plan changed to ${VENDOR_TIERS[tierKey].label}`);
    await onRefresh?.();
    setChangingTier("");
  };

  return (
    <div className="grid min-w-0 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(VENDOR_TIERS).map(([key, tier]) => (
        <Card key={key} className={account?.vendor_tier === key ? "rounded-2xl border-2 border-[#F4A849] bg-[#FFF7E8] shadow-md overflow-hidden" : "rounded-2xl border-[#2C4F4E]/20 bg-white shadow-sm overflow-hidden"}>
        <CardHeader className="p-3 sm:p-5 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{tier.label}</CardTitle>
              {account?.vendor_tier === key && <Badge>Current</Badge>}
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#2C4F4E]">{tier.price}</p>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0 text-xs sm:text-sm space-y-1.5 text-slate-700">
            <p>{tier.includedUsers} included user{tier.includedUsers > 1 ? "s" : ""}</p>
            <p>{tier.includedPins} included pin{tier.includedPins > 1 ? "s" : ""}</p>
            <p>{tier.dailyCheckInLimit ? `${tier.dailyCheckInLimit} check-in per day` : "Unlimited check-ins"}</p>
            <p>{tier.fridayToSundayOnly ? "Friday–Sunday only" : "Any day check-ins"}</p>
            <p>{tier.logoPin ? "Logo pin included" : "No logo pin"}</p>
            <p>{tier.animation ? "Animated pin included" : "No animation"}</p>
            <p>Map zoom {tier.mapZoom}+</p>
            {account?.vendor_tier === key ? (
              <Button disabled variant="outline" className="w-full mt-3">Current Plan</Button>
            ) : (
              <Button onClick={() => handleChangeTier(key)} disabled={!!changingTier} className="w-full mt-3">
                {changingTier === key ? "Updating..." : TIER_ORDER.indexOf(key) > currentTierIndex ? `Upgrade to ${tier.label}` : `Downgrade to ${tier.label}`}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}