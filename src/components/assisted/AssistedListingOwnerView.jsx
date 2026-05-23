import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin, Calendar, Map, Share2, Navigation, CheckCircle,
  Lock, ArrowRight
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

function LockedModal({ open, onClose, onSignUp }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="font-bold text-lg text-[#2C4F4E] mb-2">Create an Account to Make Changes</h3>
        <p className="text-sm text-gray-600 mb-5">
          Create a free account to claim this listing — edit details, add photos, relist, upgrade, or extend dates.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Not Now</Button>
          <Button onClick={onSignUp} className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
            Sign Up / Log In
          </Button>
        </div>
      </div>
    </div>
  );
}

function LockedAction({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full p-3 rounded-xl border border-gray-200 bg-white/60 hover:bg-gray-50 transition text-left group"
    >
      <span className="flex items-center gap-2.5 text-sm text-gray-500">
        <Lock className="w-3.5 h-3.5 text-gray-400" />
        {label}
      </span>
      <span className="text-xs text-gray-400 group-hover:text-[#5DADA5] transition">Account required →</span>
    </button>
  );
}

export default function AssistedListingOwnerView({ listing, token }) {
  const navigate = useNavigate();
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

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

  const handleViewOnMap = () => {
    navigate(createPageUrl("Home") + `?listingId=${listing.id}`);
  };

  const handleViewDetails = () => {
    navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`);
  };

  // If already authenticated, claim directly. Otherwise store intent and redirect to login.
  const handleClaim = async () => {
    if (isAuthenticated) {
      setIsClaiming(true);
      setClaimError("");
      try {
        const user = await base44.auth.me();
        const res = await base44.functions.invoke("resolveAssistedListing", {
          token,
          action: "claim_complete",
          claimUserId: user.id,
        });
        if (res.data?.status === "claimed") {
          navigate(createPageUrl("MyListings"));
        } else {
          setClaimError("Could not complete claim. Please try again.");
        }
      } catch {
        setClaimError("Something went wrong. Please try again.");
      }
      setIsClaiming(false);
    } else {
      // Store claim intent so the page auto-claims after login redirect returns
      if (token) sessionStorage.setItem("assisted_claim_token", token);
      const returnUrl = `${window.location.origin}/assisted-listing?token=${token}&autoclaim=1`;
      base44.auth.redirectToLogin(returnUrl);
    }
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
            onClick={handleViewOnMap}
            disabled={!hasCoords}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-5 text-base font-semibold gap-2 shadow-md"
          >
            <Map className="w-5 h-5" /> View On Map
          </Button>

          {/* Secondary actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={handleViewDetails} size="sm" className="bg-slate-700 hover:bg-slate-800 text-white gap-1.5">
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

      {/* Owner-locked actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">Listing Management</p>
        <LockedAction label="Edit Details" onClick={() => setShowLockedModal(true)} />
        <LockedAction label="Add Photos" onClick={() => setShowLockedModal(true)} />
        <LockedAction label="Upgrade Listing" onClick={() => setShowLockedModal(true)} />
        <LockedAction label="Relist for Another Date" onClick={() => setShowLockedModal(true)} />
        <LockedAction label="Extend Dates" onClick={() => setShowLockedModal(true)} />
      </div>

      {/* Claim CTA */}
      <div className="border-t pt-4">
        <Button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold gap-2"
        >
          {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {isClaiming ? "Claiming..." : "Claim This Listing"}
        </Button>
        {claimError && <p className="text-xs text-center text-red-500 mt-2">{claimError}</p>}
        {!isAuthenticated && (
          <p className="text-xs text-center text-gray-500 mt-2">Free account — sign in and you'll be returned here to complete the claim</p>
        )}
      </div>

      <LockedModal open={showLockedModal} onClose={() => setShowLockedModal(false)} onSignUp={handleClaim} />
    </div>
  );
}