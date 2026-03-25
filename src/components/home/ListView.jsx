import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";

// Calculate distance in feet
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function ListView({ listings, userLocation }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState("");
  const { huntStops, addToHunt } = useHunt() || { huntStops: [], addToHunt: () => {} };

  const sortedListings = useMemo(() => {
    if (!userLocation) return listings.slice(0, 10);

    // Add distance to each listing
    const withDistance = listings.map(listing => ({
      ...listing,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        listing.lat,
        listing.lng
      )
    }));

    const expansionSteps = [1, 2, 3, 5, 10, Infinity];
    let selectedListings = [];

    for (const radius of expansionSteps) {
      const inRadius = withDistance.filter(l => l.distance <= radius);

      if (inRadius.length > 0) {
        const sorted = [...inRadius].sort((a, b) => {
          const aPriorityZone = a.distance <= 3;
          const bPriorityZone = b.distance <= 3;

          // Paid priority only applies if BOTH listings are inside the 3-mile zone
          if (aPriorityZone && bPriorityZone) {
            const tierOrder = { premium: 1, featured: 2, neighborhood_tier: 3, free: 4 };
            const tierA = tierOrder[a.tier] || 4;
            const tierB = tierOrder[b.tier] || 4;
            
            if (tierA !== tierB) {
              return tierA - tierB;
            }
          }
          
          // Outside 3 miles (or within the same tier inside 3 miles), sort by closest distance only
          return a.distance - b.distance;
        });

        if (sorted.length >= 10 || radius === Infinity) {
          selectedListings = sorted.slice(0, 10);
          break;
        } else {
          selectedListings = sorted;
        }
      }
    }

    return selectedListings;
  }, [listings, userLocation]);

  const filteredListings = sortedListings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tierColors = {
    free: "bg-slate-500",
    featured: "bg-purple-600",
    premium: "bg-amber-600",
    neighborhood_tier: "bg-emerald-600"
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredListings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No listings found nearby</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className={`hover:shadow-lg transition-shadow ${listing._expired ? "opacity-60" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={tierColors[listing.tier]}>
                        {listing.tier === "neighborhood_tier" ? "Neighborhood" : listing.tier.toUpperCase()}
                      </Badge>
                      {listing._expired && (
                        <Badge className="bg-red-500 text-white">Expired</Badge>
                      )}
                    </div>
                  </div>
                  {listing.distance && (
                    <div className="text-right text-sm text-slate-600">
                      <p>{listing.distance.toFixed(1)} mi</p>
                      <p className="text-xs">away</p>
                    </div>
                  )}
                </div>

                <p className="text-slate-700 mb-4">{listing.description}</p>

                <div className="flex flex-col gap-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{listing.addressText}, {listing.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(listing.startDateTime), "PPp")}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    View Details
                  </Button>
                  
                  {HUNT_ENABLED && (
                    <Button
                      variant="outline"
                      className="flex-1 border-amber-600 text-amber-700 hover:bg-amber-50"
                      onClick={() => addToHunt(listing)}
                      disabled={huntStops.some(s => s.id === listing.id)}
                    >
                      {huntStops.some(s => s.id === listing.id) ? "Added ✅" : "Add Stop to Hunt"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}