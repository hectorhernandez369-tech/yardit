import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Map, Trash2, ExternalLink } from "lucide-react";
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
import { getListingOwnerId } from "@/lib/listingVisibility";

// Soft pill badge — consistent across status/tier
function PillBadge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 border ${className}`}>
      {children}
    </span>
  );
}

const TIER_PILL = {
  free: "bg-slate-50 text-slate-500 border-slate-200",
  basic: "bg-slate-100 text-slate-600 border-slate-200",
  featured: "bg-purple-50 text-purple-700 border-purple-200",
  premium: "bg-amber-50 text-amber-700 border-amber-200",
  marquee: "bg-rose-50 text-rose-700 border-rose-200",
  neighborhood_tier: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_PILL = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  upcoming: "bg-[#e6f3f4] text-[#006168] border-[#b3d9db]",
  coming_soon: "bg-amber-50 text-amber-700 border-amber-200",
  hidden: "bg-slate-100 text-slate-500 border-slate-200",
  under_review: "bg-yellow-50 text-yellow-700 border-yellow-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
  completed: "bg-blue-50 text-blue-600 border-blue-200",
  expired: "bg-slate-100 text-slate-400 border-slate-200",
  canceled: "bg-slate-100 text-slate-400 border-slate-200",
  pending_activation: "bg-amber-50 text-amber-700 border-amber-200",
  activated: "bg-[#e6f3f4] text-[#006168] border-[#b3d9db]",
  activated_locked: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function formatOpenCloseHours(listing) {
  const formatTime = (value) => {
    if (!value) return "—";
    const [hourString, minuteString = "00"] = String(value).split(":");
    const hour = Number(hourString);
    if (!Number.isFinite(hour)) return value;
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minuteString.padStart(2, "0")} ${suffix}`;
  };

  return `Open ${formatTime(listing.openTime || "05:00")} – Close ${formatTime(listing.closeTime || "22:00")}`;
}

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

  const isYardSale = listing.listingType === "yard_sale";
  const isNeighborhood = listing.listingType === "neighborhood_sale";
  const isEvent = listing.listingType === "event";

  const accentBar = isEvent
    ? "border-l-[#006168]"
    : isNeighborhood
    ? "border-l-emerald-500"
    : "border-l-amber-400";

  const tierPill = TIER_PILL[listing.tier] || "bg-slate-50 text-slate-500 border-slate-200";
  const statusPill = STATUS_PILL[listing.displayStatus] || "bg-slate-100 text-slate-500 border-slate-200";
  const isPaidListing = Number(listing.pricePaid || 0) > 0 || listing.payment_status === "paid" || listing.payment_intent_status === "captured" || !!listing.stripe_checkout_session_id || !!listing.stripe_payment_intent_id;

  return (
    <div className={`group relative bg-white rounded-2xl border border-slate-200/70 border-l-4 ${accentBar} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}>
      {/* Subtle folded corner for yard sales */}
      {isYardSale && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[22px] border-r-[22px] border-t-amber-50 border-r-transparent opacity-70 pointer-events-none" />
      )}

      <div className="p-5 sm:p-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1 leading-snug break-words">
              {listing.title}
            </h3>

            {/* Meta — listing number */}
            <p className="text-[11px] text-slate-400 mb-2.5 font-mono break-all">
              #{String(listingNumberText(listing))}
            </p>

            {/* Badges */}
            <div className="space-y-2">
              {/* Type + State Badges */}
              <div className="flex gap-1.5 flex-wrap">
                <PillBadge className="bg-slate-50 text-slate-500 border-slate-200">
                  {isEvent ? "Event" : isNeighborhood ? "Neighborhood Sale" : "Yard Sale"}
                </PillBadge>

                {isNeighborhood && (
                  <span className="inline-flex items-center text-xs font-bold uppercase tracking-widest rounded-full px-3 py-1 border-2 bg-blue-100 text-blue-800 border-blue-600 shadow-sm">
                    HOST
                  </span>
                )}

                {listing.co_host_user_id === user?.id && listing.co_host_status === "active" && (
                  <PillBadge className="bg-indigo-50 text-indigo-700 border-indigo-200">Co-Host</PillBadge>
                )}
                {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "pending" && (
                  <PillBadge className="bg-amber-50 text-amber-700 border-amber-200">Pending Approval</PillBadge>
                )}
                {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "approved" && (
                  <PillBadge className="bg-emerald-50 text-emerald-700 border-emerald-200">Neighborhood Approved</PillBadge>
                )}
                {listing.neighborhood_join_status === "denied" && (
                  <PillBadge className="bg-red-50 text-red-600 border-red-200">Neighborhood Denied</PillBadge>
                )}
              </div>

              {/* Tier + Status Badges */}
              <div className="flex gap-1.5 flex-wrap">
                <PillBadge className={tierPill}>{formatListingTierLabel(listing.tier)}</PillBadge>
                <PillBadge className={statusPill}>{formatListingStatusLabel(listing.displayStatus)}</PillBadge>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <Button
              size="sm"
              disabled={!hasCoords(listing)}
              onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}&ownerPreview=1`)}
              className="gap-1.5 bg-[#006168] hover:bg-[#004d52] text-white text-xs rounded-xl shadow-sm"
            >
              <Map className="w-3 h-3" />
              View on Map
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
              className="gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs rounded-xl"
            >
              <ExternalLink className="w-3 h-3" />
              View Details
            </Button>

            {getListingOwnerId(listing) === user?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(listing)}
                className="border-[#006168]/40 text-[#006168] hover:bg-[#e6f3f4] text-xs rounded-xl"
              >
                Edit
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onRelist(listing)}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs rounded-xl"
            >
              Relist
            </Button>

            {canSelfServeUpgrade(listing) && listing.listingType !== "neighborhood_sale" && (
              <Button
                size="sm"
                onClick={() => onUpgrade(listing)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-xl shadow-sm"
              >
                Upgrade
              </Button>
            )}

            {canCancelListingDirectly(listing) && !isPaidListing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(listing)}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs rounded-xl"
              >
                <Trash2 className="w-3 h-3" />
                Cancel
              </Button>
            ) : isActiveListing(listing) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(createPageUrl("ContactSupport"))}
                className="border-slate-200 text-slate-500 hover:bg-slate-50 text-xs rounded-xl"
              >
                Need Help?
              </Button>
            ) : isEffectivelyPastListing(listing) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(listing)}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs rounded-xl"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-slate-500 mb-4 leading-relaxed whitespace-pre-wrap">
            {listing.description}
          </p>
        )}

        {/* Address + Open/Close visibility hours */}
        <div className="grid md:grid-cols-2 gap-3 text-sm rounded-xl bg-slate-50/80 border border-slate-100 p-3.5">
          <div className="flex items-start gap-2 text-slate-500">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
            <span className="break-words text-xs leading-relaxed">{getListingAddressLine(listing)}</span>
          </div>

          <div className="flex items-start gap-2 text-slate-500">
            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
            <span className="text-xs leading-relaxed">{formatListingDateRange(listing)} • {formatOpenCloseHours(listing)}</span>
          </div>
        </div>

        {/* Status reason */}
        {listing.statusReason && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> {listing.statusReason}
            </p>
          </div>
        )}

        {/* Yard sale guide CTA */}
        {isYardSale && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={onShowGuide}
              className="text-xs text-[#006168] font-medium hover:text-[#004d52] underline underline-offset-2 transition-colors"
            >
              Want more traffic? View Success Guide →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}