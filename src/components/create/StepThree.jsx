import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TierSchedule from "./TierSchedule";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "Bottom section in list view",
      "1 photo",
      "Weekend only (auto-scheduled)",
      "Lowest map visibility"
    ]
  },
  {
    id: "featured",
    name: "Featured",
    price: 4.99,
    features: [
      "Top 7 in list view",
      "Up to 5 photos",
      "Active for 3 consecutive days",
      "Higher map visibility than Free"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    price: 6.99,
    features: [
      "Highest priority in list",
      "Up to 8 photos",
      "5 consecutive total days",
      "Optional Early Visibility (counts toward 5 days)"
    ],
    popular: true
  }
];

export default function StepThree({ formData, setFormData }) {
  // Neighborhood sales use fixed tier
  if (formData.listingType === "neighborhood_sale") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
          <h3 className="text-[#2C4F4E] font-semibold">Tier</h3>
          <p className="text-sm text-[#1F2937] opacity-80">
            Neighborhood sales have a fixed tier
          </p>
        </div>

        <Card className="border-2 border-[#2C4F4E] bg-[#E7D7B8]">
          <CardContent className="p-6">
            <div className="text-center">
              <Badge className="bg-[#5DADA5] text-white border-2 border-[#2C4F4E] mb-4">
                Neighborhood Sale
              </Badge>
              <h3 className="text-2xl font-bold text-[#2C4F4E] mb-2">$49 flat rate</h3>
              <p className="text-[#1F2937] mb-4 text-sm max-w-sm mx-auto">
                Host a coordinated event with your neighbors.
              </p>
              <ul className="text-left space-y-2 text-sm text-[#2C4F4E] max-w-sm mx-auto bg-white/40 p-4 rounded-lg">
                <li>✓ <strong>Covers:</strong> 500 ft radius, up to 25 homes</li>
                <li>✓ <strong>Activation:</strong> Event goes live when 5 homes confirm</li>
                <li>✓ <strong>Deadline:</strong> Need 5 homes 48 hrs before start (or downgrades to Premium Residential)</li>
                <li>✓ <strong>Advertising:</strong> Start up to 10 days before event date</li>
                <li><span className="text-xs opacity-80 mt-2 block italic">Counts as 1 stop for Join The Hunt</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Tier</h3>
        <p className="text-sm text-[#1F2937] opacity-80">
          Choose your visibility level
        </p>
      </div>

      <RadioGroup
        value={formData.tier}
        onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
      >
        {tiers.map((tier) => (
          <label key={tier.id} htmlFor={tier.id} className="cursor-pointer">
            <Card
              className={`${
                formData.tier === tier.id
                  ? "border-[#F4A849] border-2"
                  : "border-[#2C4F4E] border-2"
              } bg-[#E7D7B8] relative`}
            >
              {tier.popular && (
                <Badge className="absolute top-2 right-2 bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E]">
                  Most Popular
                </Badge>
              )}
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <RadioGroupItem value={tier.id} id={tier.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-[#2C4F4E]">{tier.name}</h3>
                      <p className="text-2xl font-bold text-[#F4A849]">
                        {tier.price === 0 ? "Free" : `$${tier.price}`}
                      </p>
                    </div>

                    <ul className="space-y-1 text-sm text-[#1F2937]">
                      {tier.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature}</li>
                      ))}
                    </ul>

                    {tier.id === "free" && (
                      <div className="mt-3 text-xs text-[#1F2937] opacity-90">
                        Free listings auto-schedule for the next weekend and expire Sunday night.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </label>
        ))}
      </RadioGroup>

      {formData.tier !== "free" && (
        <div className="bg-[#F4A849]/20 border-2 border-[#F4A849] rounded-lg p-4 text-sm">
          <p className="font-semibold text-[#2C4F4E] mb-1">Payment Demo Mode</p>
          <p className="text-[#1F2937]">
            For this MVP, payment is simulated. Your listing will be created with{" "}
            {formData.tier} tier status.
          </p>
        </div>
      )}

      {/* Tier-based scheduling */}
      <TierSchedule formData={formData} setFormData={setFormData} />
    </div>
  );
}