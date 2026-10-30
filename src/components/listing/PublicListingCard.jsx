import React from "react";
import { Button } from "@/components/ui/button";
import PublicListingCardHeader from "@/components/listing/PublicListingCardHeader";
import { getListingDescriptionText, getListingStatusUi } from "@/components/listing/listingDisplay";

export default function PublicListingCard({ listing, onView, children, viewLabel }) {
  const isEvent = listing.listingType === "event" || listing.is_vendor_event;
  const isNeighborhood = listing.listingType === "neighborhood_sale";
  const categories = isEvent ? [listing.event_category].filter(Boolean) : (listing.categories?.length ? listing.categories : [listing.category]).filter(Boolean);
  const statusUi = getListingStatusUi(listing);
  const descriptionText = getListingDescriptionText(listing);
  const accentBar = isEvent ? "border-l-[#006168]" : isNeighborhood ? "border-l-emerald-500" : "border-l-amber-400";
  return (
    <div className={`group relative bg-white rounded-2xl border border-slate-200/70 border-l-4 ${accentBar} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}>
      <div className="p-4 sm:p-5"><div className="flex flex-col gap-3">
        <PublicListingCardHeader listing={listing} statusUi={statusUi} />
        {descriptionText && <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{descriptionText}</p>}
        {categories.length > 0 && !statusUi.isComingSoon && <div className="flex flex-wrap gap-1.5">{categories.map((item, index) => <span key={`${item}-${index}`} className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">{item}</span>)}</div>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onView} className={`flex-1 text-white text-sm font-medium shadow-sm transition-all ${isEvent ? "bg-[#006168] hover:bg-[#004d52]" : isNeighborhood ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#006168] hover:bg-[#004d52]"}`}>{viewLabel || (listing.is_vendor_event ? "View Event" : "View Listing")}</Button>
          {children}
        </div>
      </div></div>
    </div>
  );
}