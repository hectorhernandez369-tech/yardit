import React from "react";
import { Card } from "@/components/ui/card";
import { EVENT_TIERS } from "@/lib/eventListingConfig";

export default function EventTierStep({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Event Tier</h3>
        <p className="text-sm text-[#1F2937] opacity-80">Choose how prominently your event appears on the map.</p>
      </div>

      <div className="grid gap-4">
        {EVENT_TIERS.map((tier) => {
          const selected = (formData.event_tier || "basic") === tier.value;
          return (
            <Card
              key={tier.value}
              className={`p-5 cursor-pointer transition-all ${selected ? "border-[3px] border-[#F4A849] bg-white shadow-lg" : "border border-[#2C4F4E]/20 bg-[#F3E6CF]/70 hover:border-[#2C4F4E]/40"}`}
              onClick={() => setFormData((prev) => ({ ...prev, event_tier: tier.value, tier: tier.value }))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold text-[#2C4F4E] text-lg">{tier.label}</div>
                    <div className="text-sm font-medium text-slate-700">${(tier.price / 100).toFixed(2)}</div>
                  </div>
                  <p className="text-sm text-slate-600">{tier.summary}</p>
                </div>
                {selected && <span className="text-xs bg-[#F4A849] text-[#2C4F4E] px-2 py-1 rounded-full font-semibold">Selected</span>}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {tier.features.map((feature) => (
                  <div key={feature} className="rounded-md bg-[#F3E6CF] px-3 py-2 text-sm text-[#2C4F4E] border border-[#2C4F4E]/10">
                    {feature}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}