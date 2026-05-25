import React from "react";
import { Card } from "@/components/ui/card";
import { EVENT_TIERS } from "@/lib/eventListingConfig";

export default function EventTierStep({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-800">Choose Visibility</h3>
        <p className="text-xs text-slate-400 mt-0.5">Pick how prominently your event appears on the map.</p>
      </div>

      <div className="grid gap-3">
        {EVENT_TIERS.map((tier) => {
          const selected = (formData.event_tier || "basic") === tier.value;
          return (
            <div
              key={tier.value}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${selected ? "border-[#006168] bg-[#e6f3f4] ring-2 ring-[#006168]/15 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
              onClick={() => setFormData((prev) => ({ ...prev, event_tier: tier.value, tier: tier.value }))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800">{tier.label}</div>
                  <div className="text-sm font-semibold text-[#006168]">${(tier.price / 100).toFixed(2)}</div>
                  <p className="text-sm text-slate-500 mt-1">{tier.summary}</p>
                </div>
                {selected && (
                  <span className="text-xs bg-[#006168] text-white px-2.5 py-1 rounded-full font-semibold shrink-0">Selected</span>
                )}
              </div>

              <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {tier.features.map((feature) => (
                  <div key={feature} className={`rounded-lg px-3 py-2 text-xs font-medium ${selected ? "bg-white/70 text-slate-700" : "bg-slate-50 text-slate-600"}`}>
                    ✓ {feature}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}