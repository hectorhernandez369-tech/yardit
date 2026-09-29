import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Loader2, List, MapPin, Sparkles, Eye } from "lucide-react";
import { HALLOWEEN_ICON_ASSETS, isAshevilleDecorationSpot } from "@/lib/halloweenMapIcons";
import { getHalloweenSpotTypeLabel } from "@/lib/halloweenSpots";

export default function SpookyListingLanding() {
  const location = useLocation();
  const navigate = useNavigate();
  const spotId = new URLSearchParams(location.search).get("id");
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!spotId) {
        setLoading(false);
        return;
      }

      try {
        const me = await base44.auth.me();
        const rows = await base44.entities.Location.filter({ id: spotId, type: "halloween_candy" });
        const candidate = rows?.[0] || null;
        const ownerMatch = Boolean(candidate && (
          candidate.owner_user_id === me.id ||
          candidate.created_by_id === me.id ||
          String(candidate.created_by || "").toLowerCase() === String(me.email || "").toLowerCase()
        ));

        setAuthorized(ownerMatch);
        setSpot(ownerMatch ? candidate : null);
      } catch {
        setAuthorized(false);
        setSpot(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [spotId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-300" />
      </div>
    );
  }

  if (!authorized || !spot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-slate-950 px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-5xl">🎃</div>
          <h1 className="mt-3 text-2xl font-black">Halloween Spot unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">This landing page is only available to the owner of the accepted Halloween Spot.</p>
          <Button onClick={() => navigate(createPageUrl("Home"))} className="mt-5 bg-orange-500 text-purple-950 hover:bg-orange-400">
            Go to Yardit Map
          </Button>
        </div>
      </div>
    );
  }

  const iconKey = spot.halloween_spot_type || spot.halloween_icon_key || "halloween_decorations";
  const iconUrl = isAshevilleDecorationSpot(spot) && spot.custom_icon_url
    ? spot.custom_icon_url
    : HALLOWEEN_ICON_ASSETS[iconKey] || HALLOWEEN_ICON_ASSETS.halloween_decorations;

  const title = spot.display_title || spot.title || "My Halloween Spot";
  const address = spot.address || [spot.street_address, spot.city, spot.state, spot.zip_code].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#581c87_0%,#2e1065_30%,#020617_75%)] px-4 py-8 text-white sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <Sparkles className="mx-auto h-8 w-8 text-yellow-300" />
          <p className="mt-2 text-xs font-black uppercase tracking-[0.28em] text-orange-300">Yardit Halloween</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Your Spot Is Live 🎃</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-purple-100/85 sm:text-base">
            Your Halloween Spot is officially on Yardit. Now see the part families will discover first.
          </p>
        </div>

        <div className="mt-7 rounded-3xl border border-orange-400/40 bg-black/30 p-5 shadow-[0_20px_70px_rgba(88,28,135,0.45)] backdrop-blur sm:p-7">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/95 p-4 text-slate-900">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-purple-950">
              <img src={iconUrl} alt="" className="h-20 w-20 object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black">{title}</h2>
              <p className="mt-1 text-sm font-bold text-purple-700">{getHalloweenSpotTypeLabel(spot)}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{address}</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-200">The fun part</p>
            <h3 className="mt-2 text-2xl font-black">See your icon on the Yardit map</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-purple-100/80">
              This is how nearby families will find your house while exploring Halloween Spots.
            </p>

            <Button
              onClick={() => navigate(createPageUrl("Home") + `?listingId=${spot.id}`)}
              className="mx-auto mt-5 h-16 w-full max-w-lg rounded-2xl bg-orange-500 text-lg font-black text-purple-950 shadow-xl shadow-orange-950/30 hover:bg-orange-400 sm:text-xl"
            >
              <MapPin className="mr-2 h-6 w-6" />
              See My Spot on the Map 🎃
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("MyListings") + "?tab=active")}
              className="mx-auto mt-3 h-12 w-full max-w-lg border-purple-300/30 bg-purple-500/10 font-bold text-purple-100 hover:bg-purple-500/20"
            >
              <List className="mr-2 h-5 w-5" />
              View My Listings
            </Button>

            <button
              type="button"
              onClick={() => navigate(createPageUrl("HalloweenSpotDetail") + `?id=${spot.id}`)}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-300 underline decoration-purple-500/50 underline-offset-4 hover:text-white"
            >
              <Eye className="h-4 w-4" />
              View Full Listing Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
