import React from "react";
import { Button } from "@/components/ui/button";
import { Map, Trash2, ExternalLink } from "lucide-react";
import { canSelfServeUpgrade } from "@/lib/listingUpgradeConfig";
import { getListingOwnerId } from "@/lib/listingVisibility";

export default function MyListingActions({
  listing,
  user,
  hasCoords,
  isActiveListing,
  isEffectivelyPastListing,
  canCancelListingDirectly,
  isPaidListing,
  onViewMap,
  onViewDetails,
  onEdit,
  onRelist,
  onUpgrade,
  onCancel,
  onDelete,
  onNeedHelp,
  className = "",
}) {
  const isOwner = getListingOwnerId(listing) === user?.id;
  const canEditListing = isOwner || listing?._residential_access_role === "household_cohost";

  return (
    <div className={`flex flex-wrap gap-2 sm:flex-col sm:items-end ${className}`}>
      <Button size="sm" disabled={!hasCoords(listing)} onClick={onViewMap} className="gap-1.5 bg-[#006168] hover:bg-[#004d52] text-white text-xs rounded-xl shadow-sm">
        <Map className="w-3 h-3" />
        View on Map
      </Button>

      <Button size="sm" variant="outline" onClick={onViewDetails} className="gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs rounded-xl">
        <ExternalLink className="w-3 h-3" />
        View Details
      </Button>

      {canEditListing && (
        <Button size="sm" variant="outline" onClick={() => onEdit(listing)} className="border-[#006168]/40 text-[#006168] hover:bg-[#e6f3f4] text-xs rounded-xl">
          Edit
        </Button>
      )}

      {isOwner && (
        <Button size="sm" variant="outline" onClick={() => onRelist(listing)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs rounded-xl">
          Relist
        </Button>
      )}

      {isOwner && canSelfServeUpgrade(listing) && listing.listingType !== "neighborhood_sale" && (
        <Button size="sm" onClick={() => onUpgrade(listing)} className="bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-xl shadow-sm">
          Upgrade
        </Button>
      )}

      {isOwner && canCancelListingDirectly(listing) && !isPaidListing ? (
        <Button size="sm" variant="outline" onClick={() => onCancel(listing)} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs rounded-xl">
          <Trash2 className="w-3 h-3" />
          Cancel
        </Button>
      ) : isActiveListing(listing) ? (
        <Button size="sm" variant="outline" onClick={onNeedHelp} className="border-slate-200 text-slate-500 hover:bg-slate-50 text-xs rounded-xl">
          Need Help?
        </Button>
      ) : isOwner && isEffectivelyPastListing(listing) ? (
        <Button size="sm" variant="outline" onClick={() => onDelete(listing)} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 text-xs rounded-xl">
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
      ) : null}
    </div>
  );
}