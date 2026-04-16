import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import { getListingSortPriority } from "@/lib/eventListingConfig";

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

const UPCOMING_PREVIEW_LABEL = "COMING SOON";

function formatGoLiveLabel(listing) {
  if (!listing?.startDateTime) return "Date unavailable";
  const timeZone = listing.timeZoneId || "UTC";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(listing.startDateTime));
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
            const isEvent = listing.listingType === "event";
            const isComingSoonEvent = isEvent && listing.startDateTime && new Date(listing.startDateTime) > new Date();
            const goLiveLabel = formatGoLiveLabel(listing);
            const categories = isEvent
              ? [listing.event_category].filter(Boolean)
              : (listing.categories?.length ? listing.categories : [listing.category]).filter(Boolean);

            return (
            <Card key={listing.id} className={`transition-all duration-200 hover:shadow-lg ${listing._expired ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {isEvent ? (
                          <>
                            <Badge variant="outline" className="text-[11px] text-slate-600 border-slate-300 bg-slate-50">
                              Event
                            </Badge>
                            <Badge variant="outline" className="text-[11px] text-slate-600 border-slate-300 bg-slate-50">
                              {listing.event_category || "Event"}
                            </Badge>
                            {isComingSoonEvent && (
                              <Badge className="bg-amber-500 text-white">{UPCOMING_PREVIEW_LABEL}</Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-slate-600 border-slate-300 bg-slate-50">
                            {listing.tier === "neighborhood_tier" ? "Neighborhood" : listing.tier?.toUpperCase()}
                          </Badge>
                        )}
                        {listing._expired && (
                          <Badge className="bg-red-500 text-white">Expired</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 leading-tight">{listing.event_name || listing.title}</h3>
                    </div>
                  </div>

                  {isComingSoonEvent ? (
                    <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
                      <p className="text-xs font-semibold text-sky-800">Active date</p>
                      <p className="text-xs text-sky-700 mt-1">{goLiveLabel}</p>
                    </div>
                  ) : categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((item, index) => (
                        <Badge key={`${item}-${index}`} variant="outline" className="text-xs border-slate-200 text-slate-700 bg-white">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      View Listing
                    </Button>
                  
                  {!isEvent && HUNT_ENABLED && (
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