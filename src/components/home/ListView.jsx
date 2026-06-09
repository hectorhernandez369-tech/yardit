import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, SlidersHorizontal, Navigation, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import SaveListingButton from "@/components/listing/SaveListingButton";
import {
  formatListingDateTimeDisplay,
  getListingDescriptionText,
  getListingPrimaryText,
  getListingSecondaryBadgeLabel,
  getListingStatusUi,
  getListingTypeBadgeLabel,
} from "@/components/listing/listingDisplay";
import ListFilterModal, { DEFAULT_LIST_FILTERS } from "@/components/home/ListFilterModal";
import { buildListViewResults } from "@/lib/listViewPipeline";

export default function ListView({ listings, vendorEvents, userLocation, mapCenter, currentUser = null, viewingOwnerPreviewMode = false }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
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
      {/* Search + Filter bar */}
      <div className="mb-4 flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search listings, city, ZIP, category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 h-10 text-sm rounded-xl border-slate-200"
          />
        </div>
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
            const isNeighborhood = listing.listingType === "neighborhood_sale";
            const categories = isEvent
              ? [listing.event_category].filter(Boolean)
              : (listing.categories?.length ? listing.categories : [listing.category]).filter(Boolean);
            const statusUi = getListingStatusUi(listing);
            const descriptionText = getListingDescriptionText(listing);
            const distMiles = listing._distance;

            const accentBar = isEvent
              ? "border-l-[#006168]"
              : isNeighborhood
              ? "border-l-emerald-500"
              : "border-l-amber-400";

            return (
              <div
                key={listing.id}
                className={`group relative bg-white rounded-2xl border border-slate-200/70 border-l-4 ${accentBar} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">
                            {getListingTypeBadgeLabel(listing)}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">
                            {getListingSecondaryBadgeLabel(listing)}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 ${
                            statusUi.isComingSoon
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : statusUi.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            {statusUi.label}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-slate-800 leading-snug">
                          {getListingPrimaryText(listing)}
                        </h3>

                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {(listing.city || listing.state) && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="text-xs">{[listing.city, listing.state].filter(Boolean).join(", ")}</span>
                            </div>
                          )}
                          {distMiles != null && isFinite(distMiles) && (
                            <span className="text-xs text-slate-400">
                              {distMiles < 0.1 ? "< 0.1 mi" : `${distMiles.toFixed(1)} mi`}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="text-xs">{formatListingDateTimeDisplay(listing)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {descriptionText && (
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{descriptionText}</p>
                    )}

                    {categories.length > 0 && !statusUi.isComingSoon && (
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((item, index) => (
                          <span key={`${item}-${index}`} className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            listing.is_vendor_event
                              ? `/VendorEventPublicPage?id=${listing.vendor_event_id}`
                              : createPageUrl("ListingDetail") + `?id=${listing.id}`
                          )
                        }
                        className={`flex-1 text-white text-sm font-medium shadow-sm transition-all ${
                          isEvent
                            ? "bg-[#006168] hover:bg-[#004d52]"
                            : isNeighborhood
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#006168] hover:bg-[#004d52]"
                        }`}
                      >
                        {listing.is_vendor_event ? "View Event" : "View Listing"}
                      </Button>

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
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {results.length === 20 && (
            <p className="text-center text-xs text-slate-400 pt-2">Showing top 20 results — refine your search or filters to see more.</p>
          )}
        </div>
      )}

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