import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Map, Trash2 } from "lucide-react";
import {
  formatListingDateRange,
  formatListingStatusLabel,
  formatListingTierLabel,
  getListingAddressLine,
  statusColors,
  tierColors,
} from "@/components/listing/listingDisplay";
import { normalizeNeighborhoodJoinStatus } from "@/lib/neighborhoodSaleState";
import { canSelfServeUpgrade } from "@/lib/listingUpgradeConfig";

export default function MyListingCard({
  listing,
  user,
  listingNumberText,
  hasCoords,
  isActiveListing,
  isEffectivelyPastListing,
  canCancelListingDirectly,
  onEdit,
  onRelist,
  onUpgrade,
  onCancel,
  onDelete,
  onShowGuide,
}) {
  const navigate = useNavigate();

  return (
    <Card className="rounded-xl border bg-white/85 shadow hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold mb-1 break-words">{listing.title}</h3>

            {/* Listing # small print */}
            <div className="text-xs text-slate-500 mb-2 space-y-1 break-all">
              <p>Listing #{String(listingNumberText(listing))}</p>
              <p>ID: {listing.id}</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="bg-white text-slate-700 border-slate-300">
                {listing.listingType === "event"
                  ? "Event"
                  : listing.listingType === "yard_sale"
                  ? "Yard Sale"
                  : listing.listingType === "neighborhood_sale"
                  ? "Neighborhood Sale"
                  : "Listing"}
              </Badge>
              {listing.co_host_user_id === user?.id && listing.co_host_status === "active" && (
                <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 border-none">
                  Co-Host
                </Badge>
              )}
              {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "pending" && (
                <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-600 border-none">Pending Neighborhood Approval</Badge>
              )}
              {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "approved" && (
                <Badge className="bg-green-600 text-white hover:bg-green-700 border-none">Neighborhood Approved</Badge>
              )}
              {listing.neighborhood_join_status === "denied" && (
                <Badge className="bg-red-600 text-white hover:bg-red-700 border-none">Neighborhood Denied</Badge>
              )}

              <Badge className={tierColors[listing.tier] || "bg-slate-500"}>
                {formatListingTierLabel(listing.tier)}
              </Badge>

              <Badge className={statusColors[listing.displayStatus] || "bg-gray-500"}>
                {formatListingStatusLabel(listing.displayStatus)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap sm:justify-end bg-white/60 rounded-xl p-2 border border-gray-100">
            <Button
              size="sm"
              disabled={!hasCoords(listing)}
              onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}`)}
              className="gap-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Map className="w-3 h-3" />
              View on Map
            </Button>

            <Button
              size="sm"
              onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
              className="bg-slate-700 hover:bg-slate-800 text-white"
            >
              View Details
            </Button>

            {listing.ownerUserId === user?.id && (
              <Button
                size="sm"
                onClick={() => onEdit(listing)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit Listing
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => onRelist(listing)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Relist
            </Button>

            {canSelfServeUpgrade(listing) && (
              <Button
                size="sm"
                onClick={() => onUpgrade(listing)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Upgrade
              </Button>
            )}

            {canCancelListingDirectly(listing) ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCancel(listing)}
                className="gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Cancel Listing
              </Button>
            ) : isActiveListing(listing) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(createPageUrl("ContactSupport"))}
                className="gap-1"
              >
                Need Help? Contact Support
              </Button>
            ) : isEffectivelyPastListing(listing) ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(listing)}
                className="gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 whitespace-pre-wrap">
          {listing.description || "(No description)"}
        </p>

        {/* Address + Dates */}
        <div className="grid md:grid-cols-2 gap-4 text-sm rounded-xl bg-orange-50/60 border border-orange-100 p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4" />
            <span className="break-words">{getListingAddressLine(listing)}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>{formatListingDateRange(listing)}</span>
          </div>
        </div>

        {listing.statusReason && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Status Note:</strong> {listing.statusReason}
            </p>
          </div>
        )}

        {listing.listingType === "yard_sale" && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={onShowGuide}
              className="text-sm text-teal-600 font-medium hover:text-teal-800 underline underline-offset-2 transition-colors"
            >
              Want more traffic? View Success Guide
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}