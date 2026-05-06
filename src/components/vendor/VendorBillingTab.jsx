import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VENDOR_TIERS } from "@/lib/vendorTiers";

export default function VendorBillingTab({ account }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Object.entries(VENDOR_TIERS).map(([key, tier]) => (
        <Card key={key} className={account?.vendor_tier === key ? "border-2 border-[#F4A849]" : "border-[#2C4F4E]/20"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tier.label}</CardTitle>
              {account?.vendor_tier === key && <Badge>Current</Badge>}
            </div>
            <p className="text-2xl font-bold text-[#2C4F4E]">{tier.price}</p>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-slate-700">
            <p>{tier.includedUsers} included user{tier.includedUsers > 1 ? "s" : ""}</p>
            <p>{tier.includedPins} included pin{tier.includedPins > 1 ? "s" : ""}</p>
            <p>{tier.dailyCheckInLimit ? `${tier.dailyCheckInLimit} check-in per day` : "Unlimited check-ins"}</p>
            <p>{tier.fridayToSundayOnly ? "Friday–Sunday only" : "Any day check-ins"}</p>
            <p>{tier.logoPin ? "Logo pin included" : "No logo pin"}</p>
            <p>{tier.animation ? "Animated pin included" : "No animation"}</p>
            <p>Map zoom {tier.mapZoom}+</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}