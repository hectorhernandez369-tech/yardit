import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getListingPrimaryText, getListingSecondaryBadgeLabel, getListingTypeBadgeLabel } from "@/components/listing/listingDisplay";

function formatListingScheduleText(listing) {
  const formatDate = (value) => {
    if (!value) return "";
    const date = String(value).includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const formatTime = (value) => {
    if (!value) return "";
    if (String(value).includes("T")) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    const [hourString, minuteString = "00"] = String(value).split(":");
    const hour = Number(hourString);
    if (!Number.isFinite(hour)) return String(value);
    return `${hour % 12 || 12}:${minuteString.padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  };

  const start = listing?.selectedRangeStartDate || listing?.startDateTime;
  const end = listing?.selectedRangeEndDate || listing?.endDateTime;
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  const dateText = startDate && endDate && startDate !== endDate ? `${startDate} – ${endDate}` : startDate || endDate || "No dates set";
  const openText = formatTime(listing?.openTime || listing?.startDateTime);
  const closeText = formatTime(listing?.closeTime || listing?.endDateTime);
  const hoursText = openText && closeText ? `Open ${openText} – Close ${closeText}` : openText ? `Open ${openText}` : closeText ? `Close ${closeText}` : "Hours unavailable";
  return `${dateText} • ${hoursText}`;
}

export default function HiddenListingsOverlay({ listings, onClose }) {
  const navigate = useNavigate();

  if (!listings || listings.length === 0) return null;

  return (
    <Dialog open={!!listings} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Other listings here</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3 mt-2 mb-4">
            {listings.map((listing) => (
              <div 
                key={listing.id} 
                className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => {
                  onClose();
                  navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`);
                }}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={`text-[10px] px-1.5 py-0 ${listing.listingType === "neighborhood_sale" ? "bg-blue-600 text-white" : listing.listingType === "event" ? "bg-slate-900 text-white" : "bg-orange-500 text-white"}`}>
                    {getListingTypeBadgeLabel(listing)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                    {getListingSecondaryBadgeLabel(listing)}
                  </Badge>
                </div>
                <h4 className="font-semibold text-sm leading-tight mb-1">
                  {getListingPrimaryText(listing)}
                </h4>
                <div className="text-xs text-slate-500 space-y-1">
                  {listing.display_address && (
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{listing.display_address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{formatListingScheduleText(listing)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}