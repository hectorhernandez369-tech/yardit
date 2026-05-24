import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin, Calendar, Map, Share2, Navigation, CheckCircle, ArrowRight
} from "lucide-react";

import {
  formatListingDateRange,
  formatListingStatusLabel,
  formatListingTierLabel,
  getListingAddressLine,
  getListingDisplayStatus,
  statusColors,
  tierColors,
} from "@/components/listing/listingDisplay";
import { base44 } from "@/api/base44Client";

// This component is only shown to logged-out sellers after approval.
// Logged-in sellers are sent directly to My Listings by AssistedListingApprovalPage.
export default function AssistedListingOwnerView({ listing, token }) {
  const navigate = useNavigate();

  if (!listing) return null;

  const displayStatus = getListingDisplayStatus(listing);
  const addressLine = getListingAddressLine(listing);
  const dateRange = formatListingDateRange(listing);
  const photos = listing.photoUrls || [];
  const lat = listing.lat ?? listing.latitude;
  const lng = listing.lng ?? listing.longitude;
  const hasCoords = !!lat && !!lng;

  const shareUrl = `${window.location.origin}${createPageUrl("ListingDetail")}?id=${listing.id}`;

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({ title: listing.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
    }
  };

  const handleDirections = () => {
    if (!hasCoords) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  // Store claim intent in sessionStorage, then redirect to login.
  // After login, AssistedListingApprovalPage will auto-run claim_complete via autoclaim param.
  const handleLoginToClaim = () => {
    if (token) sessionStorage.setItem("assisted_claim_token", token);
    const returnUrl = `${window.location.origin}/assisted-listing?token=${token}&autoclaim=1`;
    base44.auth.redirectToLogin(returnUrl);
  };

  return (
    <div className="space-y-5">
      {/* Success banner */}
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Your listing is live on Yardit!</p>
          <p className="text-sm text-green-700 mt-0.5">Shoppers nearby can find your sale on the map right now.</p>
        </div>
      </div>

      {/* Listing card */}
      <Card className="rounded-xl border bg-white/85 shadow">
        <CardContent className="p-5 space-y-4">

          {/* Photo strip */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {photos.slice(0, 4).map((url, i) => (
                <img key={i} src={url} alt="" className="h-24 w-32 object-cover rounded-lg flex-shrink-0 border border-slate-200" />
              ))}
            </div>
          )}

          {/* Title + badges */}
          <div>
            <h2 className="text-xl font-bold text-[#2C4F4E] break-words">{listing.title}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="bg-white text-slate-700 border-slate-300">Yard Sale</Badge>
              <Badge className={tierColors[listing.tier] || "bg-slate-500"}>
                {formatListingTierLabel(listing.tier)}
              </Badge>
              <Badge className={statusColors[displayStatus] || "bg-green-600"}>
                {formatListingStatusLabel(displayStatus)}
              </Badge>
              <Badge className="bg-[#5DADA5] text-white border-none">On Map</Badge>
            </div>
          </div>

          {/* Address + dates */}
          <div className="rounded-xl bg-orange-50/60 border border-orange-100 p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2 text-slate-700">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#5DADA5]" />
              <span className="break-words">{addressLine}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 shrink-0 text-[#5DADA5]" />
              <span>{dateRange}</span>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          )}

          {/* Primary action: View on Map */}
          <Button
            onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}`)}
            disabled={!hasCoords}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-5 text-base font-semibold gap-2 shadow-md"
          >
            <Map className="w-5 h-5" /> View On Map
          </Button>

          {/* Secondary actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
              size="sm"
              className="bg-slate-700 hover:bg-slate-800 text-white gap-1.5"
            >
              Details
            </Button>
            <Button onClick={handleShare} size="sm" variant="outline" className="gap-1.5 border-slate-300">
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
            <Button onClick={handleDirections} size="sm" variant="outline" className="gap-1.5 border-slate-300" disabled={!hasCoords}>
              <Navigation className="w-3.5 h-3.5" /> Directions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Login to claim CTA */}
      <div className="border-t pt-4 space-y-2">
        <Button
          onClick={handleLoginToClaim}
          className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          Log In / Sign Up to Claim This Listing
        </Button>
        <p className="text-xs text-center text-gray-500">
          Free account — after sign-in, this listing is automatically yours
        </p>
      </div>
    </div>
  );
}