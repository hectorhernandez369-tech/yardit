import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Trash2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHunt } from "@/components/hunt/HuntContext";
import { getListingAddressLine, formatListingDateRange, formatListingStatusLabel, getListingDisplayStatus, statusColors } from "@/components/listing/listingDisplay";

export default function SavedListingsTab({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { huntStops, addToHunt } = useHunt() || { huntStops: [], addToHunt: () => {} };

  const { data: savedListingsData = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ["savedListings", user?.id],
    queryFn: () => base44.entities.SavedListing.filter({ user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: allListings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ["listingsForSaved"],
    queryFn: () => base44.entities.Listing.list(),
    enabled: savedListingsData.length > 0,
  });

  const unsaveMutation = useMutation({
    mutationFn: (savedId) => base44.entities.SavedListing.delete(savedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedListings"] });
    },
  });

  if (isLoadingSaved || (savedListingsData.length > 0 && isLoadingListings)) {
    return <div className="text-center py-8 text-slate-500">Loading saved listings...</div>;
  }

  if (savedListingsData.length === 0) {
    return (
      <Card className="border-dashed bg-slate-50">
        <CardContent className="p-8 text-center text-slate-500">
          <p>You haven't saved any listings yet.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl("Home"))}>
            Explore Map
          </Button>
        </CardContent>
      </Card>
    );
  }

  const enriched = savedListingsData.map(saved => {
    const listing = allListings.find(l => l.id === saved.listing_id);
    return { ...saved, listing };
  }).filter(s => s.listing);

  const isActiveOrComing = (listing) => {
    const status = getListingDisplayStatus(listing);
    return !["expired", "cancelled", "canceled", "closed", "removed", "denied", "rejected", "suspended"].includes(status);
  };

  const currentListings = enriched.filter(s => isActiveOrComing(s.listing));
  const historyListings = enriched.filter(s => !isActiveOrComing(s.listing));

  const renderCard = (item, isHistory) => {
    const { listing, id: savedId } = item;
    const status = getListingDisplayStatus(listing);
    const isActive = status === "active";
    const isHuntStop = huntStops.some(s => s.id === listing.id);

    return (
      <Card key={savedId} className={`overflow-hidden transition-all hover:shadow-md ${isHistory ? 'opacity-70 bg-slate-50' : 'bg-white'}`}>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge className={`${statusColors[status] || "bg-gray-500"} text-[10px] px-1.5 py-0 h-4 min-h-0 text-white`}>
                {formatListingStatusLabel(status)}
              </Badge>
              {isHistory && <span className="text-xs font-semibold text-slate-500 uppercase">History</span>}
            </div>
            <h3 className="font-bold text-slate-900 truncate mb-1">{listing.title || listing.event_name || "Untitled Listing"}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{getListingAddressLine(listing)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{formatListingDateRange(listing)}</span>
            </div>
          </div>
          
          <div className="flex sm:flex-col gap-2 shrink-0">
            <Button 
              size="sm" 
              onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-1 h-8 text-xs"
            >
              View <ArrowRight className="w-3 h-3" />
            </Button>
            
            {!isHistory && isActive && (
              <Button
                size="sm"
                variant="outline"
                disabled={isHuntStop}
                onClick={() => addToHunt(listing)}
                className="flex-1 gap-1 border-amber-600 text-amber-700 hover:bg-amber-50 h-8 text-xs"
              >
                {isHuntStop ? "In Hunt" : "Add to Hunt"}
              </Button>
            )}

            {!isHistory && !isActive && (
               <Button
                 size="sm"
                 variant="outline"
                 disabled
                 className="flex-1 h-8 text-xs border-slate-200 bg-slate-50 text-slate-500"
               >
                 Not Active Yet
               </Button>
            )}

            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => unsaveMutation.mutate(savedId)}
              className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs px-2"
            >
              <Trash2 className="w-3 h-3" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Remove</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Current Saved</h2>
        {currentListings.length === 0 ? (
           <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-4">No current saved listings.</p>
        ) : (
          <div className="grid gap-3">
            {currentListings.map(item => renderCard(item, false))}
          </div>
        )}
      </div>

      {historyListings.length > 0 && (
        <div className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-bold text-slate-600 mb-4">History</h2>
          <div className="grid gap-3">
            {historyListings.map(item => renderCard(item, true))}
          </div>
        </div>
      )}
    </div>
  );
}