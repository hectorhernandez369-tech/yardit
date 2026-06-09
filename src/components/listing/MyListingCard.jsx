import React from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";
import MyListingActions from "@/components/listing/MyListingActions";
import {
  formatListingStatusLabel,
  formatListingTierLabel,
  getListingAddressLine,
  statusColors,
  tierColors,
} from "@/components/listing/listingDisplay";
import { normalizeNeighborhoodJoinStatus } from "@/lib/neighborhoodSaleState";


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

function formatListingDateWindow(listing) {
  const start = listing.selectedRangeStartDate || listing.activeDates?.[0] || listing.startDateTime;
  const end = listing.selectedRangeEndDate || listing.activeDates?.[listing.activeDates.length - 1] || listing.endDateTime;
  const formatDate = (value) => {
    if (!value) return "";
    const date = String(value).includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : format(date, "PP");
  };

  if (start && end) {
    const startText = formatDate(start);
    const endText = formatDate(end);
    return startText === endText ? startText : `${startText} — ${endText}`;
  }

  if (start) return formatDate(start);
  if (end) return formatDate(end);
  return "No dates set";
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

          <MyListingActions
            listing={listing}
            user={user}
            hasCoords={hasCoords}
            isActiveListing={isActiveListing}
            isEffectivelyPastListing={isEffectivelyPastListing}
            canCancelListingDirectly={canCancelListingDirectly}
            isPaidListing={isPaidListing}
            onViewMap={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}&ownerPreview=1`)}
            onViewDetails={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
            onEdit={onEdit}
            onRelist={onRelist}
            onUpgrade={onUpgrade}
            onCancel={onCancel}
            onDelete={onDelete}
            onNeedHelp={() => navigate(createPageUrl("ContactSupport"))}
            className="hidden sm:flex"
          />
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
            <span className="text-xs leading-relaxed">{formatListingDateWindow(listing)} • {formatOpenCloseHours(listing)}</span>
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

        <MyListingActions
          listing={listing}
          user={user}
          hasCoords={hasCoords}
          isActiveListing={isActiveListing}
          isEffectivelyPastListing={isEffectivelyPastListing}
          canCancelListingDirectly={canCancelListingDirectly}
          isPaidListing={isPaidListing}
          onViewMap={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}&ownerPreview=1`)}
          onViewDetails={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
          onEdit={onEdit}
          onRelist={onRelist}
          onUpgrade={onUpgrade}
          onCancel={onCancel}
          onDelete={onDelete}
          onNeedHelp={() => navigate(createPageUrl("ContactSupport"))}
          className="mt-4 border-t border-slate-100 pt-4 sm:hidden"
        />
      </div>
    </div>
  );
}