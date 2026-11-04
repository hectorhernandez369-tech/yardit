import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useLocation } from "react-router-dom";
import { Trophy, MapPin, Star, Loader2, ArrowLeft } from "lucide-react";
import { isHolidaySeason, getCurrentSeasonYear } from "../components/holidays/SeasonCheck";

const MIN_RATINGS = 5;
const MILES = [1, 5, 10, 25, 50];

function milesBetween(lat1, lng1, lat2, lng2) {
  const radians = Math.PI / 180;
  const deltaLat = (lat2 - lat1) * radians;
  const deltaLng = (lng2 - lng1) * radians;
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(deltaLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export default function LeaderboardPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const mapLat = Number(params.get("lat"));
  const mapLng = Number(params.get("lng"));
  const mapIsValid = params.has("lat") && params.has("lng") &&
    Number.isFinite(mapLat) && Number.isFinite(mapLng) &&
    Math.abs(mapLat) <= 90 && Math.abs(mapLng) <= 180;
  const [mode, setMode] = useState("radius");
  const [radius, setRadius] = useState(10);
  const [zip, setZip] = useState("");
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  const [devicePosition, setDevicePosition] = useState(null);
  const [locationError, setLocationError] = useState("");
  const center = useDeviceLocation ? devicePosition : (mapIsValid ? {lat: mapLat, lng: mapLng} : null);
  const seasonYear = getCurrentSeasonYear();
  const inSeason = isHolidaySeason();

  const { data: locations = [], isLoading: loadingLocations, isError: errorLocations } = useQuery({
    queryKey: ["holidayLeaderboardLocations", seasonYear],
    queryFn: () => base44.entities.Location.filter({type: "holiday_lights"}),
    enabled: inSeason,
  });
  const { data: ratings = [], isLoading: loadingRatings, isError: errorRatings } = useQuery({
    queryKey: ["holidayLeaderboardRatings", seasonYear],
    queryFn: () => base44.entities.LightRating.filter({season_year: seasonYear}),
    enabled: inSeason,
  });

  const ranked = useMemo(() => {
    const ratingsByListing = new Map();
    for (const vote of ratings) {
      if (!vote.listing_id || !Number.isFinite(Number(vote.rating_value))) continue;
      if (!ratingsByListing.has(vote.listing_id)) ratingsByListing.set(vote.listing_id, []);
      ratingsByListing.get(vote.listing_id).push(Number(vote.rating_value));
    }
    return locations
      .filter(loc => loc.type === "holiday_lights" && loc.status === "active" && loc.display_active === true)
      .map(loc => {
        const scores = ratingsByListing.get(loc.id) || [];
        if (scores.length < MIN_RATINGS) return null;
        const total = scores.reduce((acc, value) => acc + value, 0);
        return {...loc, ratingsCount: scores.length, avgRating: total / scores.length, holidayScore: total};
      })
      .filter(Boolean)
      .sort((a, b) => b.holidayScore - a.holidayScore ||
        b.avgRating - a.avgRating || b.ratingsCount - a.ratingsCount ||
        new Date(a.created_date || 0) - new Date(b.created_date || 0));
  }, [ratings, locations]);

  const matching = useMemo(() => {
    if (mode === "zip") {
      if (!/^\d{5}$/.test(zip)) return [];
      return ranked.filter(loc => String(loc.zip_code || "").trim() === zip);
    }
    if (!center) return [];
    return ranked.filter(loc => {
      const lat = Number(loc.latitude), lng = Number(loc.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng) &&
        loc.latitude !== null && loc.longitude !== null &&
        milesBetween(center.lat, center.lng, lat, lng) <= radius;
    });
  }, [ranked, mode, zip, center, radius]);

  const findDevice = () => {
    if (!navigator.geolocation) { setLocationError("Location is unavailable on this device. Try ZIP code."); return; }
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({coords}) => {setDevicePosition({lat: coords.latitude, lng: coords.longitude}); setUseDeviceLocation(true);},
      () => setLocationError("Location permission was denied. Use ZIP code or return to the map."),
      {enableHighAccuracy: false, timeout: 10000}
    );
  };

  return <div className="min-h-[calc(100vh-100px)] bg-[#f7f8f4] px-3 py-5 pb-24 sm:px-6">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[#174a38]"><ArrowLeft size={16} />Back to map</Link>
      <div className="rounded-2xl bg-[#124535] p-5 text-white shadow-lg">
        <div className="flex items-center gap-3"><Trophy className="text-[#e8c46a]" size={30} /><div>
          <h1 className="text-2xl font-bold">Christmas Leaderboard</h1>
          <p className="text-sm text-white/75">Top-rated holiday light displays · {seasonYear}</p>
        </div></div>
      </div>
      {!inSeason ? <p className="mt-6 rounded-xl bg-white p-6 text-center text-gray-600">Christmas leaderboards are available November 1–January 2.</p> : <>
        <div className="mt-4 rounded-2xl border border-[#e0e6da] bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode("radius")} className={"rounded-lg px-3 py-2 text-sm font-semibold " + (mode === "radius" ? "bg-[#124535] text-white" : "bg-gray-100 text-gray-700")}>Nearby radius</button>
            <button type="button" onClick={() => setMode("zip")} className={"rounded-lg px-3 py-2 text-sm font-semibold " + (mode === "zip" ? "bg-[#124535] text-white" : "bg-gray-100 text-gray-700")}>ZIP code</button>
          </div>
          {mode === "radius" ? <div className="mt-4">
            <label htmlFor="holiday-radius" className="mb-2 block text-sm font-medium text-gray-700">Show displays within</label>
            <select id="holiday-radius" value={radius} onChange={e => setRadius(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm">
              {MILES.map(m => <option value={m} key={m}>{m} {m === 1 ? "mile" : "miles"}</option>)}
            </select>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600">{useDeviceLocation && devicePosition ? "Centered on your location" : mapIsValid ? "Centered on the map you were viewing" : "Choose your current location"}</span>
              <button type="button" onClick={findDevice} className="rounded-lg border border-[#124535] px-3 py-2 text-xs font-semibold text-[#124535]"><MapPin size={13} className="mr-1 inline"/>Use my location</button>
            </div>
            {locationError && <p className="mt-2 text-xs text-red-700">{locationError}</p>}
          </div> : <div className="mt-4">
            <label htmlFor="holiday-zip" className="mb-2 block text-sm font-medium text-gray-700">Enter a five-digit ZIP code</label>
            <input id="holiday-zip" inputMode="numeric" maxLength={5} value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="e.g. 93291" className="w-full rounded-lg border border-gray-300 p-3 text-sm" />
            <p className="mt-2 text-xs text-gray-500">No location permission required.</p>
          </div>}
        </div>
        {loadingLocations || loadingRatings ? <div className="flex items-center justify-center gap-2 py-12 text-gray-600"><Loader2 className="animate-spin" />Loading rankings…</div>
        : errorLocations || errorRatings ? <p className="mt-4 rounded-xl bg-white p-5 text-red-700">Unable to load ratings. Try again later.</p>
        : <section className="mt-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-[#124535]">{mode === "zip" ? (zip.length === 5 ? "ZIP " + zip : "ZIP rankings") : "Within " + radius + " miles"}</h2><span className="text-xs text-gray-600">{matching.length} qualified displays</span></div>
          {mode === "radius" && !center ? <p className="rounded-xl bg-white p-6 text-center text-gray-600">Use your location to see nearby rankings, or search by ZIP code.</p>
          : mode === "zip" && zip.length !== 5 ? <p className="rounded-xl bg-white p-6 text-center text-gray-600">Enter a ZIP code to see its top displays.</p>
          : matching.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-gray-600">No active displays with at least {MIN_RATINGS} ratings in this area yet.</p>
          : <div className="space-y-3">{matching.map((loc, idx) => <div key={loc.id} className="flex items-start gap-3 rounded-xl border border-[#e0e6da] bg-white p-4 shadow-sm">
              <div className="w-10 shrink-0 text-center text-2xl">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "#" + (idx + 1)}</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[#124535]">{loc.display_title || loc.title || "Christmas display"}</h3>
                <p className="text-xs text-gray-600">{loc.address || [loc.street_address, loc.city, loc.zip_code].filter(Boolean).join(", ")}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#fff4cd] px-2 py-1 font-bold text-[#664d04]">Score {loc.holidayScore}</span><span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1"><Star size={12} />{loc.avgRating.toFixed(1)}/10</span><span className="rounded-full bg-gray-100 px-2 py-1">{loc.ratingsCount} ratings</span></div>
              </div>
            </div>)}</div>}
          <p className="mt-4 text-center text-xs text-gray-500">Ranked by total rating points, with average rating as the first tiebreaker. Minimum {MIN_RATINGS} ratings per display.</p>
        </section>}
      </>}
    </div>
  </div>;
}

