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
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import { getListingSortPriority, formatEventTierLabel } from "@/lib/eventListingConfig";

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
  const { guardAction, showModal, setShowModal, isGuest, modalProps } = useGuestGuard();

  const sortedListings = useMemo(() => {
    if (!userLocation) return [...listings].sort((a, b) => getListingSortPriority(a) - getListingSortPriority(b)).slice(0, 10);

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

    // 1. Collect ALL listings within 3 miles first
    const within3Miles = withDistance.filter(l => l.distance <= 3);
    
    // 2. Sort the 3-mile pool: Paid priority, then closest distance
    within3Miles.sort((a, b) => {
      const tierDelta = getListingSortPriority(a) - getListingSortPriority(b);
      if (tierDelta !== 0) return tierDelta;
      return a.distance - b.distance;
    });

    let selectedListings = [...within3Miles];

    // 3. If fewer than 10 listings exist after processing the 3-mile pool, expand outward
    if (selectedListings.length < 10) {
      const expansionSteps = [5, 10, Infinity];
      let previousRadius = 3;

      for (const radius of expansionSteps) {
        const inBand = withDistance.filter(l => l.distance > previousRadius && l.distance <= radius);
        
        // 4. Sort beyond 3 miles strictly by closest distance (no paid priority)
        inBand.sort((a, b) => a.distance - b.distance);
        
        selectedListings = [...selectedListings, ...inBand];
        previousRadius = radius;

        if (selectedListings.length >= 10) {
          break;
        }
      }
    }

    // 5. Combine results and return top 10
    return selectedListings.slice(0, 10);
  }, [listings, userLocation]);

  const filteredListings = sortedListings.filter(listing =>
    (listing.event_name || listing.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tierColors = {
    free: "bg-slate-500",
    basic: "bg-slate-700",
    featured: "bg-purple-600",
    premium: "bg-amber-600",
    marquee: "bg-rose-600",
    neighborhood_tier: "bg-emerald-600"
  };

  const getPaidListingTone = (listing) => {
    const tier = listing.event_tier || listing.tier;
    const isEvent = listing.listingType === "event";
    const isPaid = ["featured", "premium", "marquee"].includes(tier) || isEvent;

    if (!isPaid) {
      return {
        isPaid: false,
        label: null,
        socialProof: null,
        activity: null,
        cta: "View Listing"
      };
    }

    if (isEvent) {
      return {
        isPaid: true,
        label: "🎉 Local Event",
        socialProof: "📣 Shared by others nearby",
        activity: "📅 This weekend",
        cta: "See What's Here"
      };
    }

    if (tier === "premium" || tier === "marquee") {
      return {
        isPaid: true,
        label: "⭐ Promoted Listing",
        socialProof: "🔥 Getting attention in your area",
        activity: "🟢 Active now",
        cta: "See What's Here"
      };
    }

    return {
      isPaid: true,
      label: "📍 Featured in your area",
      socialProof: "👀 Seen by local shoppers",
      activity: "⏳ Happening soon",
      cta: "View Details"
    };
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
          {filteredListings.map((listing) => {
            const paidTone = getPaidListingTone(listing);

            return (
            <Card key={listing.id} className={`${paidTone.isPaid ? "shadow-md shadow-slate-300/60 hover:shadow-xl hover:shadow-slate-300/70 hover:scale-[1.02]" : "hover:shadow-lg"} transition-all duration-200 ${listing._expired ? "opacity-60" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={tierColors[listing.event_tier || listing.tier] || "bg-slate-500"}>
                        {listing.listingType === "event" ? formatEventTierLabel(listing.event_tier || listing.tier) : listing.tier === "neighborhood_tier" ? "Neighborhood" : listing.tier.toUpperCase()}
                      </Badge>
                      {listing.listingType === "event" && <Badge className="bg-slate-900 text-white">Event</Badge>}
                      {listing._expired && (
                        <Badge className="bg-red-500 text-white">Expired</Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-1 text-slate-900">{listing.event_name || listing.title}</h3>
                    {paidTone.label && <p className="text-xs font-medium text-slate-700 mb-1">{paidTone.label}</p>}
                    {paidTone.socialProof && <p className="text-xs text-slate-500 mb-1">{paidTone.socialProof}</p>}
                    {paidTone.activity && <p className="text-xs text-slate-500">{paidTone.activity}</p>}
                  </div>
                  {listing.distance && (
                    <div className="text-right text-sm text-slate-600">
                      <p>{listing.distance.toFixed(1)} mi</p>
                      <p className="text-xs">away</p>
                    </div>
                  )}
                </div>

                <p className="text-slate-700 mb-4">{listing.event_description || listing.description}</p>

                <div className="flex flex-col gap-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{listing.address_text || listing.addressText}, {listing.city}</span>
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
                    {paidTone.cta}
                  </Button>
                  
                  {listing.listingType !== "event" && HUNT_ENABLED && (
                    <Button
                      variant="outline"
                      className="flex-1 border-amber-600 text-amber-700 hover:bg-amber-50"
                      onClick={() => guardAction(() => addToHunt(listing), {
                        allowGuest: isGuest && huntStops.length < 2,
                        modal: {
                          title: "Create a Free Account to Save More Stops",
                          description: "Guests can preview up to 2 Hunt stops.",
                          detail: "Create a free account to save more stops and continue your hunt.",
                        }
                      })}
                      disabled={huntStops.some(s => s.id === listing.id)}
                    >
                      {huntStops.some(s => s.id === listing.id) ? "Added ✅" : "Add Stop to Hunt"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
      
      <GuestAuthModal open={showModal} onClose={setShowModal} {...modalProps} />
    </div>
  );
}