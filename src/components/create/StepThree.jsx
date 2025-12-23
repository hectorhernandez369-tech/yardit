import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "1000 ft visibility radius",
      "Bottom section in list view",
      "Up to 3 photos",
      "1 listing per week"
    ]
  },
  {
    id: "featured",
    name: "Featured",
    price: 14.99,
    features: [
      "1 mile visibility radius",
      "Top 7 in list view",
      "Up to 5 photos",
      "Active for any 3 days",
      "2 listings per week"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    price: 29.99,
    features: [
      "5 mile visibility radius",
      "Highest priority in list",
      "Up to 8 photos",
      "Active for 5 days",
      "3 listings per week"
    ],
    popular: true
  }
];

export default function StepThree({ formData, setFormData }) {
  // Neighborhood sales use fixed tier
  if (formData.listingType === "neighborhood_sale") {
    return (
      <Card className="border-emerald-500">
        <CardContent className="p-6">
          <div className="text-center">
            <Badge className="bg-emerald-600 mb-4">Neighborhood Sale</Badge>
            <h3 className="text-2xl font-bold mb-2">$49.99</h3>
            <p className="text-slate-600 mb-4">2-day neighborhood event</p>
            <ul className="text-left space-y-2 text-sm">
              <li>✓ 5 mile visibility radius</li>
              <li>✓ Up to 10 homes</li>
              <li>✓ Maximum 500 ft span</li>
              <li>✓ Highest map priority</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-lg">Choose Your Tier</Label>
      <RadioGroup
        value={formData.tier}
        onValueChange={(value) => setFormData(prev => ({ ...prev, tier: value }))}
      >
        {tiers.map((tier) => (
          <label key={tier.id} htmlFor={tier.id} className="cursor-pointer">
            <Card className={`${formData.tier === tier.id ? "border-amber-600 border-2" : ""} relative`}>
              {tier.popular && (
                <Badge className="absolute top-2 right-2 bg-amber-600">Most Popular</Badge>
              )}
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <RadioGroupItem value={tier.id} id={tier.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold">{tier.name}</h3>
                      <p className="text-2xl font-bold text-amber-700">
                        {tier.price === 0 ? "Free" : `$${tier.price}`}
                      </p>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {tier.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </label>
        ))}
      </RadioGroup>

      {formData.tier !== "free" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-amber-900 mb-1">Payment Demo Mode</p>
          <p className="text-amber-800">
            For this MVP, payment is simulated. Your listing will be created with {formData.tier} tier status.
          </p>
        </div>
      )}
    </div>
  );
}