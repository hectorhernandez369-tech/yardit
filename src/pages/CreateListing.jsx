import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import StepOne from "../components/create/StepOne";
import StepTwo from "../components/create/StepTwo";
import StepThree from "../components/create/StepThree";
import FormScrollHelper from "../components/create/FormScrollHelper";
import { isDemoMode } from "../components/shared/DemoMode";

// Tier Engine (shared business logic)
import {
  computeFeaturedDates,
  computePremiumDates,
  enforcePhotoLimit
} from "../components/shared/listingTierEngine";

const RELIST_STORAGE_KEY = "yardit_relist_prefill_v1";

// (plain english) fallback timezone until we auto-detect timezone from lat/lng later
const FALLBACK_TZ = "America/Los_Angeles";

function getDistanceFeet(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 20902231; // Earth radius in feet
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// (plain english) DEV BYPASS: your account can ignore the “1 active listing” rule while building
// Replace with your real Base44 user.id
const DEV_BYPASS_USER_IDS = ["PUT_YOUR_USER_ID_HERE"];

function isDevBypassUser(user) {
  return !!user?.id && DEV_BYPASS_USER_IDS.includes(user.id);
}

/**
 * (plain english) Next weekend rule for Free tier:
 * Auto schedule to next Friday 12:00am through Sunday 11:59pm (America/Los_Angeles)
 */
function getNextWeekendLAISO() {
  const now = new Date();
  const laString = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const laNow = new Date(laString);

  let daysToFriday = 5 - laNow.getDay();
  if (daysToFriday <= 0) daysToFriday += 7;

  const fri = new Date(laNow);
  fri.setDate(laNow.getDate() + daysToFriday);
  const sun = new Date(laNow);
  sun.setDate(laNow.getDate() + daysToFriday + 2);

  const pad = (n) => n.toString().padStart(2, "0");
  const friDateStr = `${fri.getFullYear()}-${pad(fri.getMonth() + 1)}-${pad(fri.getDate())}`;
  const sunDateStr = `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`;

  const getOffset = (dateStr) => {
    const d7 = new Date(`${dateStr}T00:00:00-07:00`);
    const h7 = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        hour12: false
      }).format(d7),
      10
    );
    return h7 === 0 || h7 === 24 ? 7 : 8;
  };

  const friOffset = getOffset(friDateStr);
  const sunOffset = getOffset(sunDateStr);

  return {
    start: new Date(`${friDateStr}T00:00:00-0${friOffset}:00`).toISOString(),
    end: new Date(`${sunDateStr}T23:59:59-0${sunOffset}:00`).toISOString(),
    startDateStr: friDateStr,
    endDateStr: sunDateStr
  };
}

function getSaleConfirmedCount(sale) {
  // (plain english) tries multiple field names so we don't miss it
  const v =
    sale?.homeCount ??
    sale?.confirmed_count ??
    sale?.confirmedCount ??
    sale?.confirmedHomes ??
    sale?.participantsCount ??
    0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function CreateListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const formContainerRef = useRef(null);

  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [geocodeRef, setGeocodeRef] = useState(null);

  // (plain english) "Sale in your area" modal state
  const [saleModalStep, setSaleModalStep] = useState(0); // 0: none, 1: popup1, 2: popup2
  const [matchedSale, setMatchedSale] = useState(null);
  const [joinAction, setJoinAction] = useState(null); // null, "requested", "none"

  const [formData, setFormData] = useState({
    listingType: "yard_sale",
    tier: "free",

    title: "",
    description: "",

    addressText: "",
    city: "",
    state: "",
    zip: "",
    lat: null,
    lng: null,

    event_center_lat: null,
    event_center_lng: null,

    // (plain english) listing-local timezone; we’ll derive later from lat/lng
    timeZoneId: FALLBACK_TZ,

    // Stored as ISO strings
    startDateTime: "",
    endDateTime: "",

    // Date-range selection (YYYY-MM-DD strings)
    selectedRangeStartDate: "",
    selectedRangeEndDate: "",

    // Premium Early Visibility
    earlyVisibilityDays: 0,
    earlyVisibilityDates: [],
    activeDates: [],

    // Categories
    mainCategories: [],
    subCategories: [],

    photoUrls: [],

    // Neighborhood fields
    homeCount: 1,
    spanFeet: 0,
    validatedDistance: false,
    validatedText: false,

    // optional flags
    locationMethod: "address"
  });

  // ✅ Relist loader: reads localStorage + maps keys + jumps to Step 3
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isRelist = params.get("relist") === "1";
    if (!isRelist) return;

    const raw = localStorage.getItem(RELIST_STORAGE_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const pre = payload?.relistPrefill || {};

      setFormData((prev) => ({
        ...prev,
        ...pre,

        addressText: pre.addressText || pre.street || "",
        city: pre.city || "",
        state: pre.state || "",
        zip: pre.zip || pre.zip_code || "",
        lat: pre.lat ?? null,
        lng: pre.lng ?? null,
        event_center_lat: pre.lat ?? null,
        event_center_lng: pre.lng ?? null,

        tier: "",
        startDateTime: "",
        endDateTime: "",
        selectedRangeStartDate: "",
        selectedRangeEndDate: "",
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: []
      }));

      setStep(3);
      localStorage.removeItem(RELIST_STORAGE_KEY);
      toast.success("Relist loaded — pick a tier and schedule");
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    fetchUser();
  }, [navigate]);

  // Pull all user listings (used for “1 active listing” rule)
  const { data: userListings } = useQuery({
    queryKey: ["userListings", user?.id],
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }),
    enabled: !!user,
    initialData: []
  });

  const { data: userJoinRequests } = useQuery({
    queryKey: ["userJoinRequests", user?.id],
    queryFn: async () => {
      try {
        return await base44.entities.JoinRequest.filter({ userId: user.id });
      } catch {
        return [];
      }
    },
    enabled: !!user,
    initialData: []
  });

  // Sale in area check is done on submit

  const hasActiveResidentialListing = () => {
    if (isDemoMode()) return false;
    if (isDevBypassUser(user)) return false; // (plain english) your account is exempt
    return (userListings || []).some((l) => l.status === "active");
  };

  const createListingMutation = useMutation({
    mutationFn: async (data) => {
      // ✅ Enforce 1 active listing per account (residential Phase 1)
      if (data.listingType !== "neighborhood_sale" && hasActiveResidentialListing()) {
        throw new Error("You already have an active listing. End it before creating another.");
      }

      const demoPrefix = isDemoMode() ? "Demo listing: " : "";

      // Generate listing number: STATE + last4zip + dash + 5 random chars
      const stateCode = (data.state || "XX").toUpperCase().slice(0, 2);
      const zipLast4 = (data.zip || "0000").slice(-4).padStart(4, "0");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let rand5 = "";
      for (let i = 0; i < 5; i++) rand5 += chars[Math.floor(Math.random() * chars.length)];
      const listingNumber = `${stateCode}${zipLast4}-${rand5}`;

      const listing = await base44.entities.Listing.create({
        ...data,
        title: demoPrefix + data.title,
        ownerUserId: user.id,
        status: "active",
        listingNumber
      });

      return listing;
    },
    onSuccess: async (createdListing) => {
      if (joinAction === "requested" && matchedSale) {
        try {
          await base44.entities.JoinRequest.create({
            listingId: createdListing.id,
            saleListingId: matchedSale.id,
            ownerUserId: matchedSale.ownerUserId,
            requesterUserId: user.id,
            status: "pending"
          });
          
          await base44.entities.Notification.create({
            userId: matchedSale.ownerUserId,
            title: "New Join Request",
            message: "Someone requested to join your Neighborhood Sale.",
            type: "join_request",
            metadata: {
              sale_listing_id: matchedSale.id,
              requester_user_id: user.id,
              requester_listing_id: createdListing.id
            }
          });
          
          await base44.entities.Notification.create({
            userId: user.id,
            title: "Join Request Sent",
            message: "Your request to join the Neighborhood Sale has been sent.",
            type: "join_request_sent"
          });
        } catch (err) {
          console.error("Failed to create join request/notifications", err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["userListings", user?.id] });
      toast.success("Listing created successfully!");
      navigate(createPageUrl("MyListings"));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create listing");
    }
  });

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.title || !formData.description) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (formData.listingType === "neighborhood_sale") {
        if (!formData.event_center_lat || !formData.event_center_lng) {
          toast.error("Please provide a location for the event center");
          return;
        }

        // (plain english) organizer address must be within 500ft (uses confirmed profile coords)
        const isMapMethod =
          !formData.locationMethod ||
          formData.locationMethod === "map" ||
          formData.locMethod === "map";

        if (isMapMethod) {
          const uLat = user?.address_lat ?? user?.lat;
          const uLng = user?.address_lng ?? user?.lng;

          if (!uLat || !uLng) {
            toast.error("Please add/confirm your profile address before creating a Neighborhood Sale.");
            return;
          }
          const dist = getDistanceFeet(uLat, uLng, formData.event_center_lat, formData.event_center_lng);
          if (dist > 500) {
            toast.error("Your profile address must be within 500 ft of the Neighborhood center.");
            return;
          }
        }

        if (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate) {
          toast.error("Please select start and end dates");
          return;
        }

        const start = new Date(formData.selectedRangeStartDate);
        const end = new Date(formData.selectedRangeEndDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays > 3) {
          toast.error("Event can be a maximum of 3 days");
          return;
        }
        if (end < start) {
          toast.error("End date cannot be before start date");
          return;
        }

        setStep(3);
        return;
      }

      if (!formData.addressText || !formData.city || !formData.state || !formData.zip) {
        toast.error("Please complete all address fields");
        return;
      }

      // Auto-trigger geocoding if lat/lng not set
      if (!formData.lat || !formData.lng) {
        if (geocodeRef) {
          toast.info("Verifying address...");
          const success = await geocodeRef();
          if (!success) {
            toast.error("We couldn't confirm this address. Please select a suggestion or check spelling.");
            return;
          }
        } else {
          toast.error("Please use 'Locate Address' to confirm your location");
          return;
        }
      }

      setStep(3);
      return;
    }
  };

  const executeSubmit = (actionStr = joinAction) => {
    let payload = { ...formData, timeZoneId: formData.timeZoneId || FALLBACK_TZ };

    // Neighborhood event normalization
    if (payload.listingType === "neighborhood_sale") {
      payload.spanFeet = 500;
      payload.tier = "neighborhood_tier";
      payload.startDateTime = new Date(formData.selectedRangeStartDate + "T00:00:00Z").toISOString();
      payload.endDateTime = new Date(formData.selectedRangeEndDate + "T23:59:59Z").toISOString();
      payload.invite_code = formData.invite_code || formData.neighborhoodDraftId;
    }

    // FREE TIER DATE RULE
    if (payload.tier === "free") {
      const nextWeekend = getNextWeekendLAISO();
      payload = {
        ...payload,
        startDateTime: nextWeekend.start,
        endDateTime: nextWeekend.end,
        selectedRangeStartDate: nextWeekend.startDateStr,
        selectedRangeEndDate: nextWeekend.endDateStr,
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: []
      };
    }

    // FEATURED
    if (formData.tier === "featured") {
      const startLocal = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
      let activeDates = [];
      const pad = (n) => String(n).padStart(2, "0");
      for(let i=0; i<3; i++) {
         const d = new Date(startLocal);
         d.setDate(d.getDate() + i);
         activeDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }

      payload = {
        ...payload,
        startDateTime: new Date(`${formData.selectedRangeStartDate}T00:00:00Z`).toISOString(),
        endDateTime: new Date(`${formData.selectedRangeEndDate}T23:59:59Z`).toISOString(),
        activeDates: activeDates,
        earlyVisibilityDays: 0,
        earlyVisibilityDates: []
      };
    }

    // PREMIUM
    if (formData.tier === "premium") {
      const earlyDays = Math.max(0, Math.min(3, Number(formData.earlyVisibilityDays || 0)));
      const startLocal = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
      const endLocal = new Date(`${formData.selectedRangeEndDate}T00:00:00`);
      const diffDays = Math.round((endLocal - startLocal) / (1000 * 60 * 60 * 24)) + 1;

      let earlyVisibilityStartDateTime = null;
      let earlyVisibilityDates = [];
      let activeDates = [];
      const pad = (n) => String(n).padStart(2, "0");
      
      for(let i=0; i<diffDays; i++) {
         const d = new Date(startLocal);
         d.setDate(d.getDate() + i);
         activeDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
      
      if (earlyDays > 0) {
         const startDt = new Date(startLocal);
         startDt.setDate(startDt.getDate() - earlyDays);
         earlyVisibilityStartDateTime = startDt.toISOString();
         
         for(let i=0; i<earlyDays; i++) {
             const d = new Date(startDt);
             d.setDate(d.getDate() + i);
             earlyVisibilityDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
         }
      }

      payload = {
        ...payload,
        startDateTime: new Date(`${formData.selectedRangeStartDate}T00:00:00Z`).toISOString(),
        endDateTime: new Date(`${formData.selectedRangeEndDate}T23:59:59Z`).toISOString(),
        earlyVisibilityDays: earlyDays,
        earlyVisibilityDates: earlyVisibilityDates,
        activeDates: activeDates,
        ...(earlyVisibilityStartDateTime && { earlyVisibilityStartDateTime })
      };
    }

    // Add Neighborhood Join Status fields
    if (actionStr === "requested" && matchedSale) {
      payload.neighborhood_join_status = "requested";
      payload.payment_intent_status = "hold_requested";
      payload.hold_deadline_at = payload.startDateTime;
      payload.neighborhood_sale_id = matchedSale.id;
    } else {
      payload.neighborhood_join_status = "none";
    }

    createListingMutation.mutate(payload);
  };

  const handleSubmit = async () => {
    // Enforce 1 active listing per account
    if (formData.listingType !== "neighborhood_sale" && hasActiveResidentialListing()) {
      toast.error("You already have an active listing. End it before creating another.");
      return;
    }

    if (formData.listingType === "neighborhood_sale") {
      if (formData.homeCount < 1 || formData.homeCount > 25) {
        toast.error("Neighborhood Sales must have between 1 and 25 homes.");
        return;
      }
    }

    // Must select tier
    if (!formData.tier) {
      toast.error("Please select a tier");
      return;
    }

    // Validate dates for featured/premium
    if ((formData.tier === "featured" || formData.tier === "premium") && (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate)) {
      toast.error("Please select start and end dates");
      return;
    }
    if (formData.tier === "featured") {
      const startLocal = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
      const endLocal = new Date(`${formData.selectedRangeEndDate}T00:00:00`);
      if (Math.round((endLocal - startLocal) / (1000 * 60 * 60 * 24)) + 1 !== 3) {
        toast.error("Featured requires exactly 3 consecutive days");
        return;
      }
    }
    if (formData.tier === "premium") {
      const startLocal = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
      const endLocal = new Date(`${formData.selectedRangeEndDate}T00:00:00`);
      const diff = Math.round((endLocal - startLocal) / (1000 * 60 * 60 * 24)) + 1;
      if (diff < 1 || diff > 5) {
        toast.error("Premium allows 1 to 5 consecutive days");
        return;
      }
    }

    // Photo limit enforcement
    const photoCheck = enforcePhotoLimit(formData.tier, formData.photoUrls || []);
    if (photoCheck.truncated) {
      toast.error(`Too many photos for ${formData.tier}. Max allowed: ${photoCheck.max}.`);
      return;
    }

    // Check for nearby neighborhood sale if we haven't asked yet
    if (formData.listingType !== "neighborhood_sale" && joinAction === null && formData.lat && formData.lng) {
      try {
        const sales = await base44.entities.Listing.filter({ listingType: "neighborhood_sale" });
        let reqs = [];
        try {
          reqs = await base44.entities.JoinRequest.filter({ userId: user.id });
        } catch {}

        const now = new Date();
        const nearby = (sales || []).filter((s) => {
          if (!s.startDateTime || !s.endDateTime) return false;
          const end = new Date(s.endDateTime);
          if (now >= end) return false;
          if (s.status === "downgraded" || s.status === "canceled") return false;

          const cLat = s.event_center_lat ?? s.lat;
          const cLng = s.event_center_lng ?? s.lng;
          const dist = getDistanceFeet(formData.lat, formData.lng, cLat, cLng);
          if (dist > 500) return false;

          if (s.ownerUserId === user.id) return false;

          const alreadyRequested = reqs.some(
            (r) => r.listingId === s.id && (r.status === "pending" || r.status === "approved")
          );
          return !alreadyRequested;
        });

        if (nearby.length > 0) {
          setMatchedSale(nearby[0]);
          setSaleModalStep(1); // Show Popup #1
          return; // Stop submission, wait for user response
        }
      } catch (err) {
        console.error(err);
      }
    }

    // If no popup needed or action already chosen, execute
    executeSubmit();
  };

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    s === step
                      ? "bg-amber-600 text-white"
                      : s < step
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                {s < 3 && (
                  <div
                    key={`line-${s}`}
                    className={`w-12 h-1 ${s < step ? "bg-green-600" : "bg-slate-200"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center gap-8 text-xs text-slate-600">
            <span className={step === 1 ? "font-semibold" : ""}>Details</span>
            <span className={step === 2 ? "font-semibold" : ""}>Location & Time</span>
            <span className={step === 3 ? "font-semibold" : ""}>Tier & Review</span>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-800 text-white">
            <CardTitle>Post Your Yard Sale</CardTitle>
          </CardHeader>
          <CardContent className="p-6" ref={formContainerRef}>
            <FormScrollHelper containerRef={formContainerRef} />

            {formData.listingType === "neighborhood_sale" && (
              <div className="mb-4 p-3 bg-[#e7d7b8]/50 border border-[#2C4F4E]/20 rounded-md text-[#2C4F4E] text-sm font-medium">
                Neighborhood Sale: Up to 25 homes within 500 feet.
              </div>
            )}

            {step === 1 && <StepOne formData={formData} setFormData={setFormData} />}
            {step === 2 && (
              <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} />
            )}
            {step === 3 && <StepThree formData={formData} setFormData={setFormData} />}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={handleNext} className="flex-1 bg-amber-600 hover:bg-amber-700">
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createListingMutation.isPending}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {createListingMutation.isPending ? "Creating..." : "Create Listing"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* (plain english) Sale-in-area popup */}
      <Dialog
        open={showSaleModal}
        onOpenChange={(open) => {
          if (!open) handleDismissSaleModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neighborhood Sale in your area</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-slate-700 mb-2">
              There is a Neighborhood Sale listed nearby for{" "}
              {matchedSale?.startDateTime ? new Date(matchedSale.startDateTime).toLocaleDateString() : ""}{" "}
              -{" "}
              {matchedSale?.endDateTime ? new Date(matchedSale.endDateTime).toLocaleDateString() : ""}
            </p>

            {matchedSale && getSaleConfirmedCount(matchedSale) < 5 && (
              <p className="text-sm font-semibold text-amber-600 mb-2">
                Needs {5 - getSaleConfirmedCount(matchedSale)} more homes to activate.
              </p>
            )}

            <p className="text-slate-700">
              <span className="font-semibold">{matchedSale?.title}</span> is happening nearby. Want to request to join?
            </p>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleDismissSaleModal}>
              Not now
            </Button>
            <Button onClick={handleJoinRequest} className="bg-amber-600 hover:bg-amber-700">
              Ask to Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}