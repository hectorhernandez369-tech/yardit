import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVendorTierConfig } from "@/lib/vendorTiers";
import TierFeatureSummary from "@/components/vendor/TierFeatureSummary";

export default function TierInfoCard({ profile, vendorAccount }) {
  const tierKey = profile?.tier || vendorAccount?.vendor_tier || "starter";
  const tier = getVendorTierConfig(tierKey);

  return (
    <Card className={tierKey === "event_organizer" ? "border-2 border-blue-300 bg-blue-50" : ""}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-xl font-bold text-[#2C4F4E]">{tier.label}</p>
          </div>
          <Badge className={tierKey === "event_organizer" ? "bg-blue-600 text-white" : "bg-[#F4A849] text-[#2C4F4E]"}>Active</Badge>
        </div>
        <TierFeatureSummary tier={tier} compact />
      </CardContent>
    </Card>
  );
}