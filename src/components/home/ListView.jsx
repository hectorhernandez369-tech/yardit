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
    if (!userLocation) return listings;

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

    // Filter by 1 mile radius
    const within1Mile = withDistance.filter(l => l.distance <= 1);

    // Separate paid and free
    const paid = within1Mile.filter(l => l.tier !== "free");
    const free = within1Mile.filter(l => l.tier === "free");

    // Sort paid: Premium > Featured > Neighborhood, then by distance
    paid.sort((a, b) => {
      const tierOrder = { premium: 1, featured: 2, neighborhood_tier: 3 };
      if (tierOrder[a.tier] !== tierOrder[b.tier]) {
        return tierOrder[a.tier] - tierOrder[b.tier];
      }
      return a.distance - b.distance;
    });

    // Sort free by distance
    free.sort((a, b) => a.distance - b.distance);

    // Take up to 7 paid
    const topPaid = paid.slice(0, 7);
    
    // Fill remaining slots with free (up to 3, or more if gap-fill)
    const remainingSlots = 10 - topPaid.length;
    const topFree = free.slice(0, Math.max(3, remainingSlots));

    return [...topPaid, ...topFree];
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