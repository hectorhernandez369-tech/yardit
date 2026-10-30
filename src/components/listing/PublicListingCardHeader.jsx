import React from "react";
import { Clock, MapPin } from "lucide-react";
import FounderBadge from "@/components/founder/FounderBadge";
import { formatListingDateTimeDisplay, getListingPrimaryText, getListingSecondaryBadgeLabel, getListingTypeBadgeLabel } from "@/components/listing/listingDisplay";

export default function PublicListingCardHeader({ listing, statusUi }) {
  const distMiles = listing._distance;
  const owner = listing.ownerUserId || listing.owner_user_id;
  return (
    <div className="flex items-start gap-3"><div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">{getListingTypeBadgeLabel(listing)}</span>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">{getListingSecondaryBadgeLabel(listing)}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 ${statusUi.isComingSoon ? "bg-amber-50 text-amber-700 border border-amber-200" : statusUi.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{statusUi.label}</span>
      </div>
      <h3 className="text-base font-semibold text-slate-800 leading-snug">{getListingPrimaryText(listing)}</h3>
      {owner && <FounderBadge userId={owner} />}
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        {(listing.city || listing.state) && <div className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="text-xs">{[listing.city, listing.state].filter(Boolean).join(", ")}</span></div>}
        {distMiles != null && isFinite(distMiles) && <span className="text-xs text-slate-400">{distMiles < 0.1 ? "< 0.1 mi" : `${distMiles.toFixed(1)} mi`}</span>}
        <div className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3 flex-shrink-0" /><span className="text-xs">{formatListingDateTimeDisplay(listing)}</span></div>
      </div>
    </div></div>
  );
}