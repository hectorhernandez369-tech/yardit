import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Check, MapPin, Star, Sparkles, ChevronDown } from "lucide-react";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: MapPin,
    color: "gray",
    days: 0,
    description: "Free listing. Appears in list view only (no map pin). 1 photo allowed. Ranked after paid listings. Shows as one of the bottom 3 listings on each page."
  },
  {
    id: "featured",
    name: "Featured",
    price: 14.99,
    icon: Star,
    color: "purple",
    days: 3,
    description: "3 total active days with map pin and mid-level zoom visibility. Appears in top 7 results for nearby Seekers. Includes photo carousel.",
    popular: true
  },
  {
    id: "premium",
    name: "Premium",
    price: 29.99,
    icon: Sparkles,
    color: "orange",
    days: 5,
    description: "5 total active days with map pin and highest zoom visibility. Always ranks above Featured listings when distance is similar. Includes extended photo carousel."
  }
];

export default function TierSelector({ selectedTier, onSelect }) {
  const [expandedTier, setExpandedTier] = useState(null);

  const handleTierClick = (tierId) => {
    onSelect(tierId);
    setExpandedTier(expandedTier === tierId ? null : tierId);
  };

  return (
    <div className="space-y-4">
      {tiers.map((tier) => {
        const Icon = tier.icon;
        const isSelected = selectedTier === tier.id;
        const isExpanded = expandedTier === tier.id;
        
        return (
          <div key={tier.id}>
            <label
              htmlFor={tier.id}
              onClick={() => handleTierClick(tier.id)}
              className={`block cursor-pointer ${
                isSelected ? "ring-2 ring-offset-2" : ""
              }`}
              style={{
                ringColor: isSelected ? `var(--${tier.color}-500)` : undefined
              }}
            >
              <Card className={`border-2 transition-all ${
                isSelected ? `border-${tier.color}-500 shadow-lg` : "border-gray-200 hover:border-gray-300"
              }`}>
                <CardContent className="p-6">
                  <RadioGroupItem value={tier.id} id={tier.id} className="sr-only" />
                  
                  {tier.popular && (
                    <Badge className="absolute top-2 right-2 text-white border-2" style={{ backgroundColor: '#E84A3F', borderColor: '#2C3E50' }}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${tier.color}-100`}>
                        <Icon className={`w-6 h-6 text-${tier.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">{tier.name}</h3>
                        <p className="text-sm text-gray-600">
                          {tier.days > 0 ? `${tier.days} active days` : "List view only"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">
                          {tier.price === 0 ? "Free" : `$${tier.price.toFixed(2)}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </label>
            
            {/* Expanded Detail Panel */}
            {isExpanded && (
              <Card className="mt-2 border-l-4 border-l-blue-500 bg-blue-50">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {tier.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}