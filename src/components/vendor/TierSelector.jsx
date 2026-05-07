import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tiers = [
  { id: "starter", name: "Starter", price: "Free", text: "Basic vendor presence" },
  { id: "pro", name: "Pro", price: "$19/mo", text: "More visibility and tools" },
  { id: "growth", name: "Growth", price: "$49/mo", text: "Best for active vendors" },
];

export default function TierSelector({ currentTier, onSelect, isSaving }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {tiers.map((tier) => {
        const active = currentTier === tier.id;
        return (
          <Card key={tier.id} className={active ? "border-[#5DADA5] ring-2 ring-[#5DADA5]/20" : ""}>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-lg">{tier.name}</h3>
              <p className="text-2xl font-bold text-[#2C4F4E]">{tier.price}</p>
              <p className="text-sm text-muted-foreground">{tier.text}</p>
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