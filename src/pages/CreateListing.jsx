import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import StepOne from "../components/create/StepOne";
import StepTwo from "../components/create/StepTwo";
import StepThree from "../components/create/StepThree";
import FormScrollHelper from "../components/create/FormScrollHelper";
import { isDemoMode } from "../components/shared/DemoMode";

// Tier Engine (shared business logic)
import {
  computeFreeWindow,
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
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// (plain english) DEV BYPASS: your account can ignore the “1 active listing” rule while building
// Replace with your real Base44 user.id
const DEV_BYPASS_USER_IDS = ["PUT_YOUR_USER_ID_HERE"];

function isDevBypassUser(user) {
  return !!user?.id && DEV_BYPASS_USER_IDS.includes(user.id);
}

export default function CreateListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const formContainerRef = useRef(null);

  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [geocodeRef, setGeocodeRef] = useState(null);

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

    // Categories (saved now, used later for “category weekends”)
    mainCategories: [],
    subCategories: [],

    photoUrls: [],

    // Neighborhood fields
    homeCount: 1,
    spanFeet: 0,
    validatedDistance: false,
    validatedText: false
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

        // ✅ bring over what we can
        ...pre,

        // ✅ map to CreateListing's actual keys (so Step 2 is filled)
        addressText: pre.addressText || pre.street || "",
        city: pre.city || "",
        state: pre.state || "",
        zip: pre.zip || pre.zip_code || "",
        lat: pre.lat ?? null,
        lng: pre.lng ?? null,
        event_center_lat: pre.lat ?? null,
        event_center_lng: pre.lng ?? null,

        // ✅ reset Step 3 fields so user must re-pick
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
    } catch (e) {
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
    onSuccess: () => {
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

        const isMapMethod = !formData.locationMethod || formData.locationMethod === "map" || formData.locMethod === "map";
        if (isMapMethod) {
          if (!user?.lat || !user?.lng) {
            toast.error("Please add/confirm your profile address before creating a Neighborhood Sale.");
            return;
          }
          const dist = getDistanceFeet(user.lat, user.lng, formData.event_center_lat, formData.event_center_lng);
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
            toast.error(
              "We couldn't confirm this address. Please select a suggestion or check spelling."
            );
            return;
          }
        } else {
          toast.error("Please use 'Locate Address' to confirm your location");
          return;
        }
      }

      // (plain english) later: derive timezoneId from lat/lng; for now we keep fallback
      setStep(3);
      return;
    }
  };

  const handleSubmit = () => {
    // ✅ Enforce 1 active listing per account (block early in UI too)
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

    const timeZoneId = formData.timeZoneId || FALLBACK_TZ;

    // ✅ Photo limit enforcement (cannot bypass)
    const photoCheck = enforcePhotoLimit(formData.tier, formData.photoUrls || []);
    if (photoCheck.truncated) {
      toast.error(`Too many photos for ${formData.tier}. Max allowed: ${photoCheck.max}.`);
      return;
    }

    let payload = { ...formData, timeZoneId };

    if (payload.listingType === "neighborhood_sale") {
      payload.spanFeet = 500;
      payload.tier = "neighborhood_tier";
      payload.startDateTime = new Date(formData.selectedRangeStartDate + "T00:00:00Z").toISOString();
      payload.endDateTime = new Date(formData.selectedRangeEndDate + "T23:59:59Z").toISOString();
    }

    // FREE (normal): compute weekend window + confirm if posted during weekend
    if (payload.listingType !== "neighborhood_sale" && formData.tier === "free" && !isDemoMode()) {
      const window = computeFreeWindow(new Date(), timeZoneId);

      if (window.isCurrentlyWeekend) {
        const ok = safeConfirm(
          "Free listings always expire Sunday at 11:59pm local time regardless of when you post. Continue?"
        );
        if (!ok) return;
      }

      payload = {
        ...payload,
        startDateTime: window.startDateTime.toISOString(),
        endDateTime: window.endDateTime.toISOString(),

        selectedRangeStartDate: "",
        selectedRangeEndDate: "",
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: []
      };
    }

    // FREE (demo): accept date-range OR ISO timestamps
    if (payload.listingType !== "neighborhood_sale" && formData.tier === "free" && isDemoMode()) {
      const hasRange = formData.selectedRangeStartDate && formData.selectedRangeEndDate;
      const hasISO = formData.startDateTime && formData.endDateTime;

      if (!hasRange && !hasISO) {
        toast.error("Please select start and end dates");
        return;
      }

      // If TierSchedule set date-range fields, build ISO from them
      if (hasRange && !hasISO) {
        payload = {
          ...payload,
          startDateTime: new Date(formData.selectedRangeStartDate + "T00:00:00Z").toISOString(),
          endDateTime: new Date(formData.selectedRangeEndDate + "T23:59:59Z").toISOString(),
        };
      }

      // Clear tier-specific fields not used by Free
      payload = {
        ...payload,
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: [],
      };
    }

    // FEATURED: exactly 3 consecutive days
    if (formData.tier === "featured") {
      if (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate) {
        toast.error("Please select start and end dates");
        return;
      }

      const res = computeFeaturedDates(
        formData.selectedRangeStartDate,
        formData.selectedRangeEndDate
      );

      if (!res.valid) {
        toast.error(res.error || "Featured requires exactly 3 consecutive days");
        return;
      }

      payload = {
        ...payload,
        activeDates: res.activeDates,
        earlyVisibilityDays: 0,
        earlyVisibilityDates: []
        // startDateTime/endDateTime should already be set by TierSchedule
      };
    }

    // PREMIUM: exactly 5 consecutive days + Early Visibility 0–3
    if (formData.tier === "premium") {
      if (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate) {
        toast.error("Please select start and end dates");
        return;
      }

      const res = computePremiumDates(
        formData.selectedRangeStartDate,
        formData.selectedRangeEndDate,
        Number(formData.earlyVisibilityDays || 0)
      );

      if (!res.valid) {
        toast.error(res.error || "Premium requires exactly 5 consecutive days");
        return;
      }

      payload = {
        ...payload,
        earlyVisibilityDays: Math.max(0, Math.min(3, Number(formData.earlyVisibilityDays || 0))),
        earlyVisibilityDates: res.earlyVisibilityDates,
        activeDates: res.activeDates
        // startDateTime/endDateTime should already be set by TierSchedule
      };
    }

    createListingMutation.mutate(payload);
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
              <StepTwo
                formData={formData}
                setFormData={setFormData}
                onGeocodeRef={setGeocodeRef}
              />
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
    </div>
  );
}

// (plain english) confirmation dialog helper
function safeConfirm(message) {
  try {
    return window.confirm(message);
  } catch (e) {
    return true;
  }
}