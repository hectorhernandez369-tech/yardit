import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Tag } from "lucide-react";
import { format } from "date-fns";
import {
  getListingDescriptionText,
  getListingNumber,
  getListingPrimaryText,
  getListingSecondaryBadgeLabel,
  getListingStatusUi,
  getListingTypeBadgeLabel,
} from "@/components/listing/listingDisplay";
import { getFeaturedItems, getFormattedDescription } from "@/components/listing/listingDetailContent";
import { getStateAbbreviation } from "@/lib/listingLocation";

function safeFormat(value, pattern) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, pattern);
}

export default function ListingPinFullDetailsPopup({ listing, isPreviewState, goLiveLabel, isHuntStop, routeIndex }) {
  const statusUi = getListingStatusUi(listing);
  const title = getListingPrimaryText(listing);
  const photos = listing?.listingType === "event"
    ? (listing?.event_photos || listing?.photoUrls || [])
    : (listing?.photoUrls || listing?.event_photos || []);
  const image = listing?.marquee_flyer_url || photos?.[0];
  const address = listing?.display_address || listing?.address_text || listing?.addressText || [listing?.city, getStateAbbreviation(listing?.state), listing?.zip].filter(Boolean).join(", ");
  const cityLine = [listing?.city, getStateAbbreviation(listing?.state)].filter(Boolean).join(", ");
  const dateLabel = listing?.startDateTime && listing?.endDateTime
    ? `${safeFormat(listing.startDateTime, "MMM d, yyyy")} – ${safeFormat(listing.endDateTime, "MMM d, yyyy")}`
    : safeFormat(listing?.startDateTime, "MMM d, yyyy") || "Date unavailable";
  const timeLabel = listing?.startDateTime && listing?.endDateTime
    ? `${safeFormat(listing.startDateTime, "h:mm a")} – ${safeFormat(listing.endDateTime, "h:mm a")}`
    : "Time unavailable";
  const categories = (listing?.listingType === "event"
    ? [listing?.event_category]
    : (listing?.categories?.length ? listing.categories : [listing?.category])
  ).filter(Boolean);
  const formattedDescription = getFormattedDescription(listing);
  const featuredItems = getFeaturedItems(listing).slice(0, 4);

  return (
    <div className="p-2 overflow-y-auto flex-1 min-h-0 space-y-3">
      {image && (
        <img src={image} alt={title} className="h-28 w-full rounded-lg object-cover border border-white/70" />
      )}

      <div className="flex items-center gap-1 flex-wrap">
        <Badge className={`text-[9px] px-1.5 py-0 h-4 min-h-0 ${listing.listingType === "neighborhood_sale" ? "bg-blue-600" : listing.listingType === "event" ? "bg-slate-900" : "bg-orange-500"}`}>
          {getListingTypeBadgeLabel(listing)}
        </Badge>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 min-h-0 capitalize bg-white/70">
          {getListingSecondaryBadgeLabel(listing)}
        </Badge>
        {!isPreviewState && (
          <Badge className={`text-[9px] px-1.5 py-0 h-4 min-h-0 ${statusUi.isComingSoon ? "bg-amber-500" : statusUi.isActive ? "bg-green-600" : "bg-slate-500"} text-white`}>
            {statusUi.label}
          </Badge>
        )}
        {isPreviewState && <Badge className="text-[9px] px-1.5 py-0 h-4 min-h-0 bg-amber-500 text-white">Preview</Badge>}
        {isHuntStop && !isPreviewState && <Badge className="text-[9px] px-1.5 py-0 h-4 min-h-0 bg-blue-600">Stop #{routeIndex + 1}</Badge>}
      </div>

      <div>
        <h3 className="font-bold text-base leading-tight text-slate-950 break-words">{title}</h3>
        <p className="mt-1 text-[10px] text-slate-500">Listing #{getListingNumber(listing)}</p>
      </div>

      {isPreviewState ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
          <p className="text-[11px] font-semibold text-amber-800">Preview only</p>
          <p className="text-[11px] text-amber-700 mt-1">Not visible to public until {goLiveLabel}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-1.5 text-[11px] text-slate-700">
            <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-medium">{dateLabel}</span>
            </div>
            <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{timeLabel}</span>
            </div>
            <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="break-words">{address || cityLine || "Location unavailable"}</span>
            </div>
          </div>

          {formattedDescription.length > 0 ? (
            <div className="space-y-1">
              {formattedDescription.map((line, index) => (
                <p key={index} className="text-[11px] text-slate-700 leading-relaxed break-words">{line}</p>
              ))}
            </div>
          ) : getListingDescriptionText(listing) ? (
            <p className="text-[11px] text-slate-700 leading-relaxed break-words">{getListingDescriptionText(listing)}</p>
          ) : null}

          {(categories.length > 0 || featuredItems.length > 0) && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Tag className="h-3 w-3" /> What you'll find
              </div>
              <div className="flex flex-wrap gap-1">
                {[...categories, ...featuredItems].slice(0, 6).map((item, index) => (
                  <Badge key={`${item}-${index}`} variant="outline" className="text-[9px] px-1.5 py-0.5 min-h-0 text-slate-600 border-slate-300 bg-white/80">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}