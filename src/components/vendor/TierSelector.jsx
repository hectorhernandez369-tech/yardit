import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VENDOR_TIERS, VENDOR_TIER_ORDER } from "@/lib/vendorTiers";
import TierFeatureSummary from "@/components/vendor/TierFeatureSummary";

const tiers = VENDOR_TIER_ORDER.filter((tier) => tier !== "free").map((id) => ({ id, ...VENDOR_TIERS[id] }));

export default function TierSelector({ currentTier, onSelect, isSaving }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {tiers.map((tier) => {
        const active = currentTier === tier.id;
        return (
          <Card key={tier.id} className={`${active ? "border-[#5DADA5] ring-2 ring-[#5DADA5]/20" : ""} ${tier.id === "event_organizer" ? "border-2 border-blue-300 bg-blue-50" : tier.id === "pro" ? "border-2 border-[#F4A849]/70 bg-[#FFF7E8]/70" : ""}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg">{tier.label}</h3>
                {tier.id === "pro" && <Badge className="bg-[#F4A849] text-[#2C4F4E]">Most Popular</Badge>}
                {tier.id === "event_organizer" && <Badge className="bg-blue-600 text-white">Organizer</Badge>}
              </div>
              <p className="text-2xl font-bold text-[#2C4F4E]">{tier.price.replace("/month", "/mo")}</p>
              <p className="text-sm text-muted-foreground">{tier.id === "event_organizer" ? "Built for recurring events" : tier.eventAccessLabel}</p>
              <TierFeatureSummary tier={tier} compact />
              <Button disabled={isSaving || active} onClick={() => onSelect(tier.id)} className="w-full rounded-xl">
                {active ? "Current Tier" : "Choose Tier"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}