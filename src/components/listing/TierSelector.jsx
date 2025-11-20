import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Check, MapPin, Star, Users, Sparkles } from "lucide-react";

const tiers = [
  {
    id: "free",
    name: "Free Listing",
    price: 0,
    icon: MapPin,
    color: "gray",
    features: [
      "Visible in 'Sales Near You' feed only",
      "1 photo upload",
      "Short description (160 chars)",
      "Active Fri-Sun (3 days)",
      "Basic impressions counter"
    ],
    restrictions: [
      "No map pin",
      "Limited editing",
      "Ads displayed on page"
    ]
  },
  {
    id: "map_pin",
    name: "Map Pin Listing",
    price: 4.99,
    icon: MapPin,
    color: "blue",
    features: [
      "Standard map pin",
      "Shows in Nearby Sales",
      "Up to 3 photos",
      "Full description",
      "Full editing allowed",
      "Add-ons available",
      "Active Fri-Sun"
    ],
    popular: false
  },
  {
    id: "featured",
    name: "Featured Sale",
    price: 14.99,
    icon: Star,
    color: "purple",
    features: [
      "Highlighted map pin",
      "Top of search results",
      "Up to 10 photos",
      "Full editing",
      "1 FREE Boost (24hrs)",
      "Share tools included",
      "Active Fri-Sun"
    ],
    popular: true
  },
  {
    id: "neighborhood_event",
    name: "Neighborhood Event",
    price: 49.99,
    icon: Users,
    color: "orange",
    features: [
      "Create event header",
      "Up to 25 connected sub-pins",
      "Featured on ZIP homepage",
      "Shareable event link",
      "Active 2 weekends (6 days)",
      "Full analytics"
    ],
    popular: false
  }
];

export default function TierSelector({ selectedTier, onSelect }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {tiers.map((tier) => {
        const Icon = tier.icon;
        const isSelected = selectedTier === tier.id;
        
        return (
          <label
            key={tier.id}
            htmlFor={tier.id}
            className={`relative cursor-pointer group ${
              isSelected ? "ring-2 ring-offset-2" : ""
            }`}
            style={{
              ringColor: isSelected ? `var(--${tier.color}-500)` : undefined
            }}
          >
            <Card className={`h-full border-2 transition-all ${
              isSelected ? `border-${tier.color}-500` : "border-gray-200 hover:border-gray-300"
            }`}>
              <CardContent className="p-6">
                <RadioGroupItem value={tier.id} id={tier.id} className="sr-only" />
                
                {tier.popular && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${tier.color}-100`}>
                      <Icon className={`w-6 h-6 text-${tier.color}-600`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        ${tier.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-4 flex-1">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {tier.restrictions && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500 italic">
                        {tier.restrictions.join(" • ")}
                      </p>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </label>
        );
      })}
    </div>
  );
}