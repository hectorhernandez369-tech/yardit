import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, Baby, CalendarDays, Candy, Clock3, Footprints, Ghost, Lightbulb, Loader2, MapPin, Navigation, Share2, Star, Volume2, Plus } from "lucide-react";
import { toast } from "sonner";
import SaveListingButton from "@/components/listing/SaveListingButton";
import ReportModal from "@/components/ReportModal";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import { HALLOWEEN_ICON_ASSETS } from "@/lib/halloweenMapIcons";
import { getHalloweenSpotTypeLabel } from "@/lib/halloweenSpots";

function formatDate(value) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const d = new Date(`${raw}T12:00:00`);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(value) {
  if (!value) return "";
  const [h, m] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toListingShape(spot) {
  if (!spot) return null;
  return {
    ...spot,
    id: spot.id,
    listingType: "halloween_spot",
    title: spot.display_title || spot.title || "Halloween Spot",
    addressText: spot.address || [spot.street_address, spot.city, spot.state, spot.zip_code].filter(Boolean).join(", "),
    city: spot.city || "",
    state: spot.state || "",
    zip: spot.zip_code || "",
    lat: Number(spot.latitude),
    lng: Number(spot.longitude),
    tier: "free",
    category: "Halloween",
    categories: ["Halloween"],
    startDateTime: spot.start_date_time || "",
    endDateTime: spot.end_date_time || spot.expires_at || "",
    photoUrls: spot.photos || [],
  };
}

export default function HalloweenSpotDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const spotId = params.get("id");
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const huntContext = useHunt() || { huntStops: [], addToHunt: () => {} };
  const { huntStops, addToHunt } = huntContext;
  const { guardAction, showModal, setShowModal, isGuest, modalProps } = useGuestGuard();

  useEffect(() => {
    const load = async () => {
      if (!spotId) { setLoading(false); return; }
      try {
        const response = await base44.functions.invoke("getPublicMapData", { halloweenLocationId: spotId });
        setSpot(response?.data?.halloweenLocation || null);
      } catch (error) {
        console.error(error);
        setSpot(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [spotId]);

  const listing = useMemo(() => toListingShape(spot), [spot]);
  const isHuntStop = listing ? huntStops.some((stop) => stop.id === listing.id) : false;
  const iconKey = spot?.halloween_spot_type || spot?.halloween_icon_key || "halloween_decorations";
  const iconUrl = spot?.custom_icon_url || HALLOWEEN_ICON_ASSETS[iconKey] || HALLOWEEN_ICON_ASSETS.halloween_decorations;
  const startDate = spot?.halloween_start_date || spot?.start_date_time;
  const endDate = spot?.halloween_end_date || spot?.end_date_time;
  const startTime = spot?.halloween_start_time || spot?.viewing_start_time;
  const endTime = spot?.halloween_end_time || spot?.viewing_end_time;
  const tags = spot?.halloween_tags || [];
  const photos = spot?.photos || [];
  const address = listing?.addressText || "";

  const handleDirections = () => {
    if (!listing || !Number.isFinite(listing.lat) || !Number.isFinite(listing.lng)) return;
    const query = encodeURIComponent(address || `${listing.lat},${listing.lng}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = listing?.title || "Halloween Spot on Yardit";
    const text = spot?.description || `Check out this ${getHalloweenSpotTypeLabel(spot)} on Yardit.`;
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("Could not share this spot");
    }
  };

  if (loading) return <div className="min-h-[70vh] bg-slate-950 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-300" /></div>;

  if (!spot || !listing) return (
    <div className="min-h-[70vh] bg-slate-950 px-4 py-16 text-center text-white">
      <Ghost className="mx-auto h-12 w-12 text-purple-300" />
      <h1 className="mt-4 text-2xl font-black">Halloween Spot not found</h1>
      <p className="mt-2 text-sm text-slate-400">It may no longer be active or available publicly.</p>
      <Button className="mt-6 bg-orange-600 hover:bg-orange-500" onClick={() => navigate(createPageUrl("Home"))}>Back to Map</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-5 sm:py-6">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/20"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>

        <section className="overflow-hidden rounded-3xl border border-orange-400/50 bg-gradient-to-b from-purple-950 via-slate-950 to-black shadow-[0_20px_70px_rgba(88,28,135,0.45)]">
          <div className="relative p-5 sm:p-7">
            <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_10%_20%,rgba(168,85,247,0.24),transparent_32%)]" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-orange-300/40 bg-orange-500/10 shadow-[0_0_32px_rgba(249,115,22,0.28)]"><img src={iconUrl} alt="" className="h-24 w-24 object-contain" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border border-orange-300/40 bg-orange-500/15 text-orange-100">Halloween Spot</Badge>
                  {spot.halloween_featured_badge === "must_see" && <Badge className="bg-yellow-500 text-black"><Star className="mr-1 h-3 w-3" />Yardit Must See</Badge>}
                </div>
                <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{listing.title}</h1>
                <p className="mt-1 text-sm font-bold text-purple-200">{getHalloweenSpotTypeLabel(spot)}</p>
                {spot.description && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">{spot.description}</p>}
              </div>
            </div>
          </div>

          {photos.length > 0 && <div className="grid gap-2 border-y border-white/10 bg-black/20 p-3 sm:grid-cols-3 sm:p-4">{photos.slice(0, 3).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${listing.title} photo ${index + 1}`} className="h-52 w-full rounded-2xl border border-white/10 object-cover" />)}</div>}

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-orange-200">Visit Details</h2>
                <div className="mt-3 space-y-3 text-sm text-slate-200">
                  <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" /><span>{address || "Address unavailable"}</span></div>
                  <div className="flex gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" /><span>{formatDate(startDate)}{endDate && String(endDate).slice(0,10) !== String(startDate).slice(0,10) ? ` – ${formatDate(endDate)}` : ""}</span></div>
                  <div className="flex gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" /><span>{formatTime(startTime)}{endTime ? ` – ${formatTime(endTime)}` : ""}</span></div>
                </div>
              </div>

              {(spot.halloween_host_name || spot.halloween_admission || spot.halloween_parking_notes || spot.halloween_activities) && <div className="rounded-2xl border border-orange-300/20 bg-orange-500/5 p-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-orange-200">Event Info</h2>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {spot.halloween_host_name && <Info label="Host / Organization" value={spot.halloween_host_name} />}
                  {spot.halloween_admission && <Info label="Admission" value={spot.halloween_admission} />}
                  {spot.halloween_parking_notes && <Info label="Parking" value={spot.halloween_parking_notes} wide />}
                  {spot.halloween_activities && <Info label="Activities" value={spot.halloween_activities} wide />}
                </div>
              </div>}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-purple-200">What to Expect</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.includes("kid_friendly") && <Feature icon={Baby} label="Kid Friendly" tone="purple" />}
                  {tags.includes("no_candy_here") && <Feature icon={Candy} label="No Candy Here" tone="orange" />}
                  {spot.halloween_candy_available && !tags.includes("no_candy_here") && <Feature icon={Candy} label="Candy Available" tone="orange" />}
                  {spot.halloween_walkthrough && <Feature icon={Footprints} label="Walk-through" tone="purple" />}
                  {spot.halloween_lights && <Feature icon={Lightbulb} label="Lights" tone="yellow" />}
                  {spot.halloween_sound && <Feature icon={Volume2} label="Sound / Music" tone="purple" />}
                  {spot.halloween_jump_scares && <Feature icon={AlertTriangle} label="Jump Scares" tone="red" />}
                  {spot.halloween_suggested_age && <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold">Suggested age: {spot.halloween_suggested_age}</span>}
                  {!tags.length && !spot.halloween_candy_available && !spot.halloween_walkthrough && !spot.halloween_lights && !spot.halloween_sound && !spot.halloween_jump_scares && !spot.halloween_suggested_age && <p className="text-sm text-slate-400">No additional visitor notes were added.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-orange-300/20 bg-orange-500/5 p-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-orange-200">Plan Your Stop</h2>
              <Button onClick={handleDirections} disabled={!Number.isFinite(listing.lat) || !Number.isFinite(listing.lng)} className="w-full bg-orange-600 hover:bg-orange-500"><Navigation className="mr-2 h-4 w-4" /> Directions</Button>
              <SaveListingButton listing={listing} className="w-full justify-center border-purple-300/30 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20" />
              {HUNT_ENABLED && <Button variant="outline" disabled={isHuntStop} onClick={() => guardAction(() => addToHunt(listing), { allowGuest: isGuest && huntStops.length < 2, modal: { title: "Create a Free Account to Save More Stops", description: "Guests can preview up to 2 Hunt stops.", detail: "Create a free account to save more stops and continue your hunt." } })} className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"><Plus className="mr-2 h-4 w-4" />{isHuntStop ? "Already in Hunt" : "Add to Hunt"}</Button>}
              <Button variant="outline" onClick={handleShare} className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
              <Button variant="ghost" onClick={() => guardAction(() => setReportOpen(true))} className="w-full text-red-300 hover:bg-red-500/10 hover:text-red-200"><AlertTriangle className="mr-2 h-4 w-4" /> Report Spot</Button>
            </div>
          </div>
        </section>
      </div>

      {reportOpen && <ReportModal listingId={listing.id} targetType="location" onClose={() => setReportOpen(false)} />}
      <GuestAuthModal open={showModal} onClose={setShowModal} {...modalProps} />
    </div>
  );
}

function Feature({ icon: Icon, label, tone }) {
  const classes = tone === "red" ? "border-red-300/30 bg-red-500/15 text-red-100" : tone === "yellow" ? "border-yellow-300/30 bg-yellow-500/15 text-yellow-100" : tone === "orange" ? "border-orange-300/30 bg-orange-500/15 text-orange-100" : "border-purple-300/30 bg-purple-500/15 text-purple-100";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${classes}`}><Icon className="h-3.5 w-3.5" />{label}</span>;
}

function Info({ label, value, wide = false }) {
  return <div className={`rounded-xl border border-white/10 bg-black/15 p-3 ${wide ? "sm:col-span-2" : ""}`}><p className="text-[10px] font-black uppercase tracking-widest text-orange-200">{label}</p><p className="mt-1 text-sm text-slate-200">{value}</p></div>;
}
