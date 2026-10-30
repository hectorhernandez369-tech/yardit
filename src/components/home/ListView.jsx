import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import SaveListingButton from "@/components/listing/SaveListingButton";
import PublicListingCard from "@/components/listing/PublicListingCard";

import ListFilterModal, { DEFAULT_LIST_FILTERS } from "@/components/home/ListFilterModal";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { buildListViewResults } from "@/lib/listViewPipeline";

export default function ListView({ listings, vendorEvents, userLocation, mapCenter, currentUser = null, viewingOwnerPreviewMode = false, searchQuery = "", onSearchQueryChange = null, onRefresh = null }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_LIST_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { huntStops, addToHunt } = useHunt() || { huntStops: [], addToHunt: () => {} };
  const { guardAction, showModal, setShowModal, isGuest, modalProps } = useGuestGuard();

  const results = useMemo(() => buildListViewResults({
    listings,
    vendorEvents,
    userLocation,
    mapCenter,
    searchQuery,
    filters,
    currentUser,
    viewingOwnerPreviewMode,
  }), [listings, vendorEvents, userLocation, mapCenter, searchQuery, filters, currentUser, viewingOwnerPreviewMode]);

  const hasLocation = !!userLocation;

  const hasActiveFilters =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_LIST_FILTERS);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Filter bar */}
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilterModal(true)}
          className={`h-10 px-3 shrink-0 rounded-xl border-2 flex items-center gap-1.5 text-xs font-semibold transition-all ${
            hasActiveFilters
              ? "border-slate-800 bg-slate-800 text-white"
              : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">List Filters</span>
          <span className="xs:hidden">Filter</span>
          {hasActiveFilters && (
            <span className="ml-0.5 bg-white/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
          )}
        </Button>
      </div>

      {/* Location context */}
      {!hasLocation && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Navigation className="w-3.5 h-3.5 shrink-0" />
          <span>Enable location for closest-first results</span>
        </div>
      )}

      {/* Results */}
      <PullToRefresh onRefresh={onRefresh} disabled={!onRefresh}>
      {results.length === 0 ? (
        <div className="rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm p-12 text-center">
          <p className="text-slate-500 text-sm font-medium mb-1">No listings found</p>
          <p className="text-slate-400 text-xs">
            {searchQuery
              ? "Try a different search term or adjust your filters."
              : hasActiveFilters
              ? 'Try "View All" in List Filters to include Free listings.'
              : "No active listings nearby."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(listing => {
            const isEvent = listing.listingType === "event" || listing.is_vendor_event;
            return (
              <PublicListingCard key={listing.id} listing={listing} onView={() => navigate(listing.is_vendor_event ? `/VendorEventPublicPage?id=${listing.vendor_event_id}` : createPageUrl("ListingDetail") + `?id=${listing.id}`)}>
                      <SaveListingButton
                        listing={listing}
                        iconOnly={true}
                        className="w-9 h-9 px-0 flex-shrink-0 border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl"
                      />

                      {!isEvent && HUNT_ENABLED && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-sm"
                          onClick={() =>
                            guardAction(() => addToHunt(listing), {
                              allowGuest: isGuest && huntStops.length < 2,
                              modal: {
                                title: "Create a Free Account to Save More Stops",
                                description: "Guests can preview up to 2 Hunt stops.",
                                detail: "Create a free account to save more stops and continue your hunt.",
                              },
                            })
                          }
                          disabled={huntStops.some(s => s.id === listing.id)}
                        >
                          {huntStops.some(s => s.id === listing.id) ? "✓ Added" : "+ Hunt Stop"}
                        </Button>
                      )}
              </PublicListingCard>
            );
          })}

          {results.length === 20 && (
            <p className="text-center text-xs text-slate-400 pt-2">Showing top 20 results — refine your search or filters to see more.</p>
          )}
        </div>
      )}
      </PullToRefresh>

      <ListFilterModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        filters={filters}
        onFiltersChange={setFilters}
        hasLocation={hasLocation}
      />

      <GuestAuthModal open={showModal} onClose={setShowModal} {...modalProps} />
    </div>
  );
}