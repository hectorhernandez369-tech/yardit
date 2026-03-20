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
import { useAppMode } from "../components/shared/DemoMode";
import {
  deriveNeighborhoodEventState,
  getNeighborhoodCreationLeadTimeError,
  isNeighborhoodJoinAllowed,
  normalizeNeighborhoodJoinStatus,
} from "@/lib/neighborhoodSaleState";

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

function buildNeighborhoodDeadlineJobs(startDateTime, saleListingId) {
  const start = new Date(startDateTime);
  return [
    {
      sale_listing_id: saleListingId,
      checkpoint_type: "warning_48h",
      run_at: new Date(start.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    },
    {
      sale_listing_id: saleListingId,
      checkpoint_type: "cancel_24h",
      run_at: new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    },
  ];
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

  const findNearbyNeighborhoodSale = async (locationOverride = null) => {
    const sourceLocation = locationOverride || formData;
    if (!user?.id || formData.listingType === "neighborhood_sale" || !sourceLocation?.lat || !sourceLocation?.lng) return null;

    const sales = await base44.entities.Listing.filter({ listingType: "neighborhood_sale" });
    let reqs = [];
    try {
      reqs = await base44.entities.JoinRequest.filter({ requesterUserId: user.id });
    } catch {}

    const now = new Date();
    const nearby = (sales || []).filter((sale) => {
      if (!sale.startDateTime || !sale.endDateTime) return false;
      const end = new Date(sale.endDateTime);
      if (now >= end) return false;
      if (!isNeighborhoodJoinAllowed(sale, now)) return false;

      const cLat = sale.event_center_lat ?? sale.lat;
      const cLng = sale.event_center_lng ?? sale.lng;
      const dist = getDistanceFeet(formData.lat, formData.lng, cLat, cLng);
      if (dist > 500) return false;
      if (sale.ownerUserId === user.id) return false;

      const alreadyRequested = reqs.some(
        (request) => request.saleListingId === sale.id && ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(request.status))
      );
      return !alreadyRequested;
    });

    return nearby[0] || null;
  };
  const [activeRescue, setActiveRescue] = useState(null);

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
    category: "",
    categories: [],
    collectible_type: null,

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
    const rescueToken = new URLSearchParams(location.search).get("rescueToken");
    if (!rescueToken || !user?.id) return;

    const loadRescue = async () => {
      const rescues = await base44.entities.NeighborhoodTierRescue.filter({ token: rescueToken }, "-created_date");
      const rescue = rescues.find((item) => item.user_id === user.id && item.status === "active" && (!item.expires_at || new Date(item.expires_at) > new Date()));
      if (!rescue) {
        toast.error("This rescue link is no longer available.");
        return;
      }

      setActiveRescue(rescue);
      setFormData((prev) => ({
        ...prev,
        listingType: "yard_sale",
        title: prev.title || "Yard Sale",
        description: prev.description || "",
        tier: "",
        addressText: rescue.addressText,
        city: rescue.city,
        state: rescue.state,
        zip: rescue.zip,
        lat: rescue.lat,
        lng: rescue.lng,
        locationMethod: "profile",
        participant_origin: "standalone",
        neighborhood_join_status: "none",
        neighborhood_sale_id: "",
        origin_sale_listing_id: "",
        startDateTime: "",
        endDateTime: "",
        selectedRangeStartDate: "",
        selectedRangeEndDate: "",
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: [],
      }));
      setStep(3);
      toast.success("Neighborhood rescue loaded — choose a tier to keep your sale live.");
    };

    loadRescue();
  }, [location.search, user?.id]);

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

  const { isDemoMode: isGlobalDemoMode } = useAppMode();
  const profileAddressMissing = !user?.street_address || !user?.city || !user?.state || !user?.zip_code;
  const profileAddressUnconfirmed = profileAddressMissing || !user?.address_lat || !user?.address_lng;
  const regularAddressIncomplete = !formData.addressText || !formData.city || !formData.state || !formData.zip;

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
        return await base44.entities.JoinRequest.filter({ requesterUserId: user.id });
      } catch {
        return [];
      }
    },
    enabled: !!user,
    initialData: []
  });

  // Sale in area check is done on submit

  const hasActiveResidentialListing = () => {
    if (isGlobalDemoMode) return false;
    if (isDevBypassUser(user)) return false; 
    
    const now = Date.now();
    return (userListings || []).some((l) => {
      if (l.status === "completed" || l.status === "suspended" || l.status === "expired") return false;
      if (l.endDateTime && new Date(l.endDateTime).getTime() < now) return false;
      
      return l.status === "active" || l.status === "under_review";
    });
  };

  useEffect(() => {
    const cleanup = async () => {
      if (!userListings || userListings.length === 0) return;
      const now = Date.now();
      const toUpdate = userListings.filter(l => 
        l.status === "active" && l.endDateTime && new Date(l.endDateTime).getTime() < now
      );
      
      for (const l of toUpdate) {
        try {
          await base44.entities.Listing.update(l.id, { status: "expired" });
        } catch (e) {}
      }
      if (toUpdate.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["userListings", user?.id] });
      }
    };
    cleanup();
  }, [userListings, user, queryClient]);

  const createListingMutation = useMutation({
    mutationFn: async (data) => {
      // ✅ Enforce 1 active listing per account (residential Phase 1)
      if (data.listingType !== "neighborhood_sale" && hasActiveResidentialListing()) {
        throw new Error("You already have an active listing. End it before creating another.");
      }

      const demoPrefix = isGlobalDemoMode ? "Demo listing: " : "";

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
        status: data.listingType === "neighborhood_sale" ? (data.status || "collecting_participants") : "active",
        event_state: data.listingType === "neighborhood_sale" ? (data.event_state || "pending_activation") : data.event_state,
        listingNumber
      });

      return listing;
    },
    onSuccess: async (createdListing) => {
      if (createdListing.listingType === "neighborhood_sale") {
        try {
          const jobs = buildNeighborhoodDeadlineJobs(createdListing.startDateTime, createdListing.id);
          await Promise.all(jobs.map((job) => base44.entities.NeighborhoodDeadlineJob.create(job)));

          const allListings = await base44.entities.Listing.list("-created_date");
          const saleStart = new Date(createdListing.startDateTime).getTime();
          const saleEnd = new Date(createdListing.endDateTime).getTime();
          const inviteTargets = (allListings || []).filter((candidate) => {
            if (!candidate || candidate.listingType === "neighborhood_sale") return false;
            if (candidate.ownerUserId === createdListing.ownerUserId) return false;
            if (candidate.status !== "active" && candidate.status !== "under_review") return false;
            if (candidate.neighborhood_sale_id || normalizeNeighborhoodJoinStatus(candidate.neighborhood_join_status) !== "none") return false;
            if (typeof candidate.lat !== "number" || typeof candidate.lng !== "number") return false;

            const candidateStart = candidate.startDateTime ? new Date(candidate.startDateTime).getTime() : null;
            const candidateEnd = candidate.endDateTime ? new Date(candidate.endDateTime).getTime() : null;
            if (!candidateStart || !candidateEnd) return false;
            if (candidateEnd < saleStart || candidateStart > saleEnd) return false;

            const cLat = createdListing.event_center_lat ?? createdListing.lat;
            const cLng = createdListing.event_center_lng ?? createdListing.lng;
            return getDistanceFeet(candidate.lat, candidate.lng, cLat, cLng) <= 500;
          });

          const invitedUsers = [...new Set(inviteTargets.map((candidate) => candidate.ownerUserId).filter(Boolean))];
          await Promise.all(invitedUsers.map((userId) => base44.entities.Notification.create({
            userId,
            user_id: userId,
            title: "Neighborhood Sale Invitation",
            message: "A Neighborhood Sale was created near your listing. Cancel your current listing first, then tap here to request to join as a Neighborhood participant.",
            type: "join_invitation",
            related_entity_type: "listing",
            related_entity_id: createdListing.id,
            metadata: {
              sale_listing_id: createdListing.id,
              invite_code: createdListing.invite_code,
              event_title: createdListing.title,
            }
          })));
        } catch (err) {
          console.error("Failed to create neighborhood deadline jobs", err);
        }
      }

      if (joinAction === "requested" && matchedSale) {
        try {
          await base44.entities.JoinRequest.create({
            listingId: createdListing.id,
            saleListingId: matchedSale.id,
            ownerUserId: matchedSale.ownerUserId,
            requesterUserId: user.id,
            status: "pending",
            participant_origin_snapshot: "standalone"
          });

          await base44.entities.Notification.create({
            userId: matchedSale.ownerUserId,
            user_id: matchedSale.ownerUserId,
            title: "New Join Request",
            message: "Someone requested to join your Neighborhood Sale.",
            type: "join_request",
            metadata: {
              sale_listing_id: matchedSale.id,
              requester_user_id: user.id,
              requester_listing_id: createdListing.id,
              event_title: matchedSale.title
            }
          });

          await base44.entities.Notification.create({
            userId: user.id,
            user_id: user.id,
            title: "Join Request Sent",
            message: "Your request to join the Neighborhood Sale has been sent.",
            type: "join_request_sent",
            metadata: {
              sale_listing_id: matchedSale.id,
              requester_user_id: user.id,
              requester_listing_id: createdListing.id,
              event_title: matchedSale.title
            }
          });
        } catch (err) {
          console.error("Failed to create join request/notifications", err);
        }
      }

      if (activeRescue?.id) {
        try {
          await base44.entities.NeighborhoodTierRescue.update(activeRescue.id, {
            status: "used",
            used_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error("Failed to mark rescue as used", err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["userListings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Listing created successfully!");
      navigate(createPageUrl("MyListings"));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create listing");
    }
  });

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.title) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (formData.listingType !== "neighborhood_sale") {
        if (!formData.description || (!formData.category && (!formData.categories || formData.categories.length === 0))) {
          toast.error("Please fill in all required fields");
          return;
        }
        if ((formData.category === "Collectibles" || formData.categories?.includes("Collectibles")) && !formData.collectible_type) {
          toast.error("Please select a collectible type");
          return;
        }
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

        if (formData.host_mode === "self") {
          const hostLat = formData.host_address_lat ?? user?.address_lat;
          const hostLng = formData.host_address_lng ?? user?.address_lng;

          if (!user?.street_address || !user?.city || !user?.state || !user?.zip_code || !hostLat || !hostLng) {
            toast.error("Please use your confirmed address before creating a Neighborhood Sale.");
            return;
          }

          const dist = getDistanceFeet(hostLat, hostLng, formData.event_center_lat, formData.event_center_lng);
          if (dist > 500) {
            toast.error("Host must be within 500 ft of the selected Neighborhood Sale center.");
            return;
          }
        } else if (formData.host_mode === "cohost") {
          if (formData.cohost_invite_status !== "accepted" || !formData.host_address_lat || !formData.host_address_lng) {
            toast.error("A co-host with a confirmed in-radius address must accept before this sale can be created.");
            return;
          }

          const dist = getDistanceFeet(formData.host_address_lat, formData.host_address_lng, formData.event_center_lat, formData.event_center_lng);
          if (dist > 500) {
            toast.error("Host must be within 500 ft of the selected Neighborhood Sale center.");
            return;
          }
        } else {
          toast.error("Please confirm the host address for this Neighborhood Sale.");
          return;
        }

        if (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate) {
          toast.error("Please select start and end dates");
          return;
        }

        const leadTimeError = getNeighborhoodCreationLeadTimeError(formData.selectedRangeStartDate);
        if (leadTimeError) {
          toast.error(leadTimeError);
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

      if (!isGlobalDemoMode) {
        if (profileAddressUnconfirmed) {
          toast.error("Your address must be confirmed in Settings before you can complete account setup or create a live listing.");
          navigate(createPageUrl("Settings"));
          return;
        }

        const nextData = {
          ...formData,
          addressText: user.street_address,
          city: user.city,
          state: (user.state || "").toUpperCase().slice(0, 2),
          zip: user.zip_code,
          lat: user.address_lat,
          lng: user.address_lng,
          locationMethod: "profile"
        };
        setFormData(nextData);

        const nearbySale = await findNearbyNeighborhoodSale(nextData);
        if (nearbySale) {
          setMatchedSale(nearbySale);
          setSaleModalStep(1);
          return;
        }

        setStep(3);
        return;
      }

      if (profileAddressMissing) {
        toast.error("Please add an address in your profile before creating a listing");
        return;
      }

      if (!formData.addressText || !formData.city || !formData.state || !formData.zip) {
        toast.error("Address is still loading. Please wait a moment and try again.");
        return;
      }

      if (!geocodeRef) {
        toast.error("Please use 'Locate Address' to confirm your location");
        return;
      }

      const success = await geocodeRef();
      if (!success) {
        return;
      }

      const nearbySale = await findNearbyNeighborhoodSale();
      if (nearbySale) {
        setMatchedSale(nearbySale);
        setSaleModalStep(1);
        return;
      }

      setStep(3);
      return;
    }
  };

  const executeSubmit = (actionStr = joinAction) => {
    let payload = { ...formData, timeZoneId: formData.timeZoneId || FALLBACK_TZ };

    if (payload.listingType !== "neighborhood_sale" && !isGlobalDemoMode) {
      payload = {
        ...payload,
        addressText: user?.street_address || payload.addressText,
        city: user?.city || payload.city,
        state: (user?.state || payload.state || "").toUpperCase().slice(0, 2),
        zip: user?.zip_code || payload.zip,
        lat: user?.address_lat ?? payload.lat,
        lng: user?.address_lng ?? payload.lng,
      };
    }

    // Neighborhood event normalization
    if (payload.listingType === "neighborhood_sale") {
      payload.spanFeet = 500;
      payload.tier = "neighborhood_tier";
      payload.category = "Neighborhood Sale";
      payload.categories = [];
      payload.description = payload.description || "";
      payload.startDateTime = new Date(formData.selectedRangeStartDate + "T00:00:00Z").toISOString();
      payload.endDateTime = new Date(formData.selectedRangeEndDate + "T23:59:59Z").toISOString();
      payload.invite_code = formData.invite_code || formData.neighborhoodDraftId;
      payload.status = "collecting_participants";
      payload.activation_status = "pending";
      payload.event_state = "pending_activation";
      payload.homeCount = 1;
      payload.pricePaid = 0;
      payload.addressText = formData.host_addressText || payload.addressText;
      payload.city = formData.host_city || payload.city;
      payload.state = formData.host_state || payload.state;
      payload.zip = formData.host_zip || payload.zip;
    }

    if (actionStr === "requested" && matchedSale) {
      payload = {
        ...payload,
        tier: "free",
        pricePaid: 0,
        startDateTime: matchedSale.startDateTime,
        endDateTime: matchedSale.endDateTime,
        selectedRangeStartDate: matchedSale.selectedRangeStartDate || matchedSale.startDateTime?.slice(0, 10),
        selectedRangeEndDate: matchedSale.selectedRangeEndDate || matchedSale.endDateTime?.slice(0, 10),
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: matchedSale.activeDates || [],
      };
    }

    // FREE TIER DATE RULE
    if (payload.tier === "free" && actionStr !== "requested") {
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
    if (payload.listingType !== "neighborhood_sale") {
      payload.participant_origin = payload.participant_origin || "standalone";
    }

    if (actionStr === "requested" && matchedSale) {
      payload.neighborhood_join_status = "pending";
      payload.payment_intent_status = "none";
      payload.hold_deadline_at = null;
      payload.neighborhood_sale_id = matchedSale.id;
      payload.participant_origin = "neighborhood_invite";
      payload.origin_sale_listing_id = matchedSale.id;
      payload.status = "active";
    } else {
      payload.neighborhood_join_status = payload.neighborhood_join_status || "none";
    }

    if (isGlobalDemoMode) {
      payload.is_demo_listing = true;
      payload.payment_intent_status = "none";
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
      const leadTimeError = getNeighborhoodCreationLeadTimeError(formData.selectedRangeStartDate);
      if (leadTimeError) {
        toast.error(leadTimeError);
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
              <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} />
            )}
            {step === 3 && <StepThree formData={formData} setFormData={setFormData} />}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={step === 2 && formData.listingType !== "neighborhood_sale" && (isGlobalDemoMode ? (profileAddressMissing || regularAddressIncomplete) : profileAddressUnconfirmed)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
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

      {/* Popup #1 */}
      <Dialog
        open={saleModalStep === 1}
        onOpenChange={(open) => {
          if (!open) {
            setJoinAction("none");
            setSaleModalStep(0);
            setStep(3);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neighborhood event in your area</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-slate-700 mb-2">
              There is a Neighborhood Sale in your area. Request to Join?
            </p>
            <p className="text-sm text-slate-600">
              {matchedSale?.startDateTime ? new Date(matchedSale.startDateTime).toLocaleDateString() : ""}
              {matchedSale?.endDateTime ? ` - ${new Date(matchedSale.endDateTime).toLocaleDateString()}` : ""}
            </p>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setJoinAction("none");
              setSaleModalStep(0);
              setStep(3);
            }}>
              NO THANKS
            </Button>
            <Button onClick={() => setSaleModalStep(2)} className="bg-amber-600 hover:bg-amber-700">
              ASK TO JOIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup #2 */}
      <Dialog
        open={saleModalStep === 2}
        onOpenChange={(open) => {
          if (!open) {
            setSaleModalStep(0);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Important</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-slate-700 whitespace-pre-line leading-relaxed">
              Joining a Neighborhood Sale creates a Neighborhood participant listing and skips normal tier/payment checkout.{"\n"}
              If this Neighborhood Sale is canceled or your participation is removed, you will need to create a normal listing to appear independently.
            </p>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setJoinAction("none");
              setSaleModalStep(0);
              setStep(3);
            }}>
              CANCEL
            </Button>
            <Button onClick={() => {
              setJoinAction("requested");
              setSaleModalStep(0);
              executeSubmit("requested");
            }} className="bg-amber-600 hover:bg-amber-700">
              REQUEST TO JOIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}