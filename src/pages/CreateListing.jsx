import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getAdminSession } from "../components/admin/AdminLoginModal";

import StepOne from "../components/create/StepOne";
import StepTwo from "../components/create/StepTwo";
import StepThree from "../components/create/StepThree";
import ResidentialPaymentStep from "../components/payment/ResidentialPaymentStep";
import NeighborhoodSetupStep from "../components/payment/NeighborhoodSetupStep";
import FormScrollHelper from "../components/create/FormScrollHelper";
import EventDetailsStep from "../components/create/event/EventDetailsStep";
import EventLocationStep from "../components/create/event/EventLocationStep";
import EventScheduleStep from "../components/create/event/EventScheduleStep";
import EventTierStep from "../components/create/event/EventTierStep";
import MarqueeSlotsEditor from "../components/create/event/MarqueeSlotsEditor";
import AdminAssignUserStep from "../components/admin/AdminAssignUserStep";
import PrimaryAddressVerificationGate from "../components/create/PrimaryAddressVerificationGate";
import { canPerformTrustAction, hasVerifiedPrimaryAddress } from "@/lib/trustActions";
import { useAppMode } from "../components/shared/DemoMode";
import YardSaleGuideModal from "../components/guide/YardSaleGuideModal";
import {
  deriveNeighborhoodEventState,
  getNeighborhoodCreationLeadTimeError,
  isNeighborhoodJoinAllowed,
  normalizeNeighborhoodJoinStatus,
} from "@/lib/neighborhoodSaleState";

// Tier Engine (shared business logic)
import {
  computeFreeWindow,
  computeFeaturedDates,
  computePremiumDates,
  enforcePhotoLimit,
  getPhotoLimitByTier
} from "../components/shared/listingTierEngine";
import { EVENT_TIER_PRICES } from "@/lib/eventListingConfig";
import { getEventScheduleValidation } from "@/lib/eventSchedule";
import { buildResolvedListingLocation, isLocationReadyForSubmission, resolveTimeZoneFromCoordinates, getStateAbbreviation } from "@/lib/listingLocation";

const RELIST_STORAGE_KEY = "yardit_relist_prefill_v1";
const PAID_LISTING_CHECKOUT_KEY = "yardit_paid_listing_checkout_v1";
const NEIGHBORHOOD_SETUP_KEY = "yardit_neighborhood_setup_v1";
const RESIDENTIAL_TIER_PRICES = {
  featured: 499,
  premium: 799,
};

const FALLBACK_TZ = "";

function normalizeResidentialRelistTier(value) {
  if (["free", "featured", "premium"].includes(value)) return value;
  return "";
}

function getRequestedStep(search) {
  const params = new URLSearchParams(search);
  if (params.get("relist") === "1" || params.get("rescueToken") || params.get("payment") || params.get("neighborhoodSetup")) {
    return null;
  }

  const requestedStep = Number(params.get("step"));
  return [1, 2, 3, 4].includes(requestedStep) ? requestedStep : null;
}

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
      attempt_count: 0,
    },
    {
      sale_listing_id: saleListingId,
      checkpoint_type: "charge_24h",
      run_at: new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      attempt_count: 0,
    },
  ];
}

export default function CreateListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToLogin } = useAuth();
  const queryClient = useQueryClient();
  const formContainerRef = useRef(null);

  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [geocodeRef, setGeocodeRef] = useState(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const handledCheckoutSessionRef = useRef(null);
  const handledNeighborhoodSetupSessionRef = useRef(null);

  // (plain english) "Sale in your area" modal state
  const [saleModalStep, setSaleModalStep] = useState(0); // 0: none, 1: popup1, 2: popup2
  const [matchedSale, setMatchedSale] = useState(null);
  const [joinAction, setJoinAction] = useState(null); // null, "requested", "none"

  const isAdminCreate = new URLSearchParams(location.search).get("adminCreate") === "1";
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState(null);

  useEffect(() => {
    if (isAdminCreate && user && !["master", "supervisor"].includes(user.role)) {
      toast.error("You do not have permission to use Admin Create Listing.");
      navigate(createPageUrl("AdminLite"));
    }
  }, [isAdminCreate, user, navigate]);

  const findNearbyNeighborhoodSale = async (locationOverride = null) => {
    const sourceLocation = locationOverride || formData;
    console.log("[JOIN_DEBUG] Checking for nearby neighborhood sales...", {
      sourceLat: sourceLocation?.lat,
      sourceLng: sourceLocation?.lng,
      listingType: formData.listingType,
      userId: user?.id
    });

    if (!user?.id || formData.listingType === "neighborhood_sale" || !sourceLocation?.lat || !sourceLocation?.lng) {
      console.log("[JOIN_DEBUG] Aborting check: missing location or wrong type");
      return null;
    }

    const sales = await base44.entities.Listing.filter({ listingType: "neighborhood_sale" }, "-created_date", 250);
    let reqs = [];
    try {
      reqs = await base44.entities.JoinRequest.filter({ requesterUserId: user.id });
    } catch {}

    const now = new Date();
    const nearby = (sales || []).filter((sale) => {
      const eventState = deriveNeighborhoodEventState(sale, now);
      console.log(`[JOIN_DEBUG] Event State Check -> ID: ${sale.id} | state: ${eventState}`);

      if (!sale.startDateTime || !sale.endDateTime) {
        console.log(`[JOIN_DEBUG] Sale ${sale.id} skipped: missing dates`);
        return false;
      }
      const end = new Date(sale.endDateTime);
      if (now >= end) {
        console.log(`[JOIN_DEBUG] Sale ${sale.id} skipped: expired`);
        return false;
      }
      
      const isAllowed = isNeighborhoodJoinAllowed(sale, now);
      if (!isAllowed) {
        console.log(`[JOIN_DEBUG] Sale ${sale.id} skipped: join not allowed (state: ${eventState})`);
        return false;
      }

      const homeCount = getSaleConfirmedCount(sale);
      if (homeCount >= 25) {
        console.log(`[JOIN_DEBUG] Sale ${sale.id} skipped: full (homes: ${homeCount})`);
        return false;
      }

      const cLat = sale.event_center_lat ?? sale.lat;
      const cLng = sale.event_center_lng ?? sale.lng;
      const dist = getDistanceFeet(sourceLocation.lat, sourceLocation.lng, cLat, cLng);
      
      console.log(`[JOIN_DEBUG] RADIUS CHECK -> Listing: ${sourceLocation.lat}, ${sourceLocation.lng} | Event: ${cLat}, ${cLng} | Distance: ${dist} | Within 500ft: ${dist <= 500}`);

      if (dist > 500) return false;
      
      if (sale.ownerUserId === user.id) {
        console.log(`[JOIN_DEBUG] Sale ${sale.id} skipped: current user is organizer`);
        return false;
      }

      const alreadyRequested = reqs.some(
        (request) => request.saleListingId === sale.id && ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(request.status))
      );
      
      if (alreadyRequested) {
        console.log(`[JOIN_DEBUG] Sale ${sale.id} skipped: user already requested`);
      }
      
      return !alreadyRequested;
    });

    console.log(`[JOIN_DEBUG] Found ${nearby.length} nearby sales`);
    return nearby[0] || null;
  };
  const [activeRescue, setActiveRescue] = useState(null);

  const [formData, setFormData] = useState({
    listingType: "yard_sale",
    tier: "free",
    event_tier: "basic",
    event_name: "",
    event_description: "",
    event_category: "",
    event_icon: "calendar",
    event_photos: [],
    display_address: "",
    geocoded_address: "",
    location_source: "search",
    address_text: "",
    coming_soon_start_date: "",
    event_start_date: "",
    event_end_date: "",
    event_start_time: "",
    event_end_time: "",
    start_datetime: "",
    end_datetime: "",
    marquee_schedule_slots: [],

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

  useEffect(() => {
    const requestedStep = getRequestedStep(location.search);
    if (requestedStep) {
      setStep(requestedStep);
    }
  }, [location.search]);

  // ✅ Relist loader: reads localStorage + maps keys + routes by listing type
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isRelist = params.get("relist") === "1";
    if (!isRelist) return;

    const raw = localStorage.getItem(RELIST_STORAGE_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const pre = payload?.relistPrefill || {};
      const originalRelistTier = payload?.tier || pre?.tier || "";
      const relistPrefillTier = normalizeResidentialRelistTier(pre?.tier || payload?.tier || "");
      const isEventRelist = pre.listingType === "event" || payload.listingType === "event";

      console.log("[RELIST_DEBUG] relist payload tier info", {
        originalListingTier: originalRelistTier,
        relistPrefillTier,
        payloadTier: payload?.tier,
        preTier: pre?.tier,
      });

      if (isEventRelist) {
        // Event relist: restore all event fields, start at step 1
        setFormData((prev) => ({
          ...prev,
          listingType: "event",

          // Step 1 — Details
          event_name: pre.event_name || "",
          event_description: pre.event_description || "",
          event_category: pre.event_category || "",
          event_icon: pre.event_icon || "",
          event_photos: pre.event_photos || [],

          // Step 2 — Location
          display_address: pre.display_address || pre.address_text || pre.addressText || "",
          geocoded_address: pre.geocoded_address || "",
          location_source: pre.location_source || "search",
          address_text: pre.display_address || pre.address_text || pre.addressText || "",
          addressText: pre.display_address || pre.addressText || pre.address_text || "",
          city: pre.city || "",
          state: pre.state || "",
          zip: pre.zip || "",
          lat: pre.lat ?? null,
          lng: pre.lng ?? null,
          event_center_lat: pre.lat ?? null,
          event_center_lng: pre.lng ?? null,

          // Step 3 — Schedule cleared (user picks new dates)
          event_start_date: "",
          event_end_date: "",
          event_start_time: "",
          event_end_time: "",
          start_datetime: "",
          end_datetime: "",
          startDateTime: "",
          endDateTime: "",

          // Step 4 — Tier: preserve original (marquee stays marquee)
          event_tier: pre.event_tier || "basic",
          tier: pre.event_tier || "basic",

          // Marquee extras
          marquee_schedule_slots: pre.marquee_schedule_slots || [],
          marquee_flyer_url: pre.marquee_flyer_url || "",
          marquee_background_url: pre.marquee_background_url || "",
          event_logo_url: pre.event_logo_url || "",
        }));

        setStep(1);
        localStorage.removeItem(RELIST_STORAGE_KEY);
        toast.success("Event relist loaded — review your details and continue");
      } else {
        // Yard sale / neighborhood sale relist: jump straight to step 3
        let relistTimeZoneId = pre.timeZoneId || "";
        if (!relistTimeZoneId && typeof pre.lat === "number" && typeof pre.lng === "number") {
          relistTimeZoneId = resolveTimeZoneFromCoordinates(pre.lat, pre.lng) || "";
        }

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
          timeZoneId: relistTimeZoneId,

          tier: relistPrefillTier,
          startDateTime: "",
          endDateTime: "",
          selectedRangeStartDate: "",
          selectedRangeEndDate: "",
          earlyVisibilityDays: 0,
          earlyVisibilityDates: [],
          activeDates: []
        }));

        console.log("[RELIST_DEBUG] applying residential relist tier", {
          originalListingTier: originalRelistTier,
          relistPrefillTier,
        });

        setStep(3);
        localStorage.removeItem(RELIST_STORAGE_KEY);
        toast.success("Relist loaded — pick a tier and schedule");
      }
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
        navigateToLogin();
      }
    };
    fetchUser();
  }, [navigateToLogin]);

  const { isDemoMode: isGlobalDemoMode } = useAppMode();
  const userHasVerifiedPrimaryAddress = hasVerifiedPrimaryAddress(user);
  const profileAddressMissing = !userHasVerifiedPrimaryAddress;
  const profileAddressUnconfirmed = !userHasVerifiedPrimaryAddress;
  const profileIncomplete = !canPerformTrustAction(user);
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

  const isEventFlow = formData.listingType === "event";
  const paymentStepNumber = isEventFlow ? 5 : 4;
  const entryStepNumber = isEventFlow ? 4 : 3;

  const getActiveResidentialListing = () => {
    if (isGlobalDemoMode) return null;
    if (isDevBypassUser(user)) return null;

    const now = Date.now();
    return (userListings || []).find((l) => {
      if (l.status === "completed" || l.status === "suspended" || l.status === "expired") return false;
      if (l.endDateTime && new Date(l.endDateTime).getTime() < now) return false;

      return l.status === "active" || l.status === "under_review";
    }) || null;
  };

  const hasActiveResidentialListing = () => {
    return !!getActiveResidentialListing();
  };

  const startPaidListingCheckout = async () => {
    if (window.self !== window.top) {
      console.warn("Stripe checkout blocked inside iframe preview");
      setPaymentError("Stripe checkout must be tested from the published app, not the Base44 preview.");
      toast.error("Stripe checkout must be tested from the published app, not the Base44 preview.");
      return;
    }

    const amountCents = formData.listingType === "event"
      ? EVENT_TIER_PRICES[formData.event_tier || formData.tier]
      : RESIDENTIAL_TIER_PRICES[formData.tier];
    if (!amountCents) {
      toast.error("Unsupported paid tier.");
      return;
    }

    try {
      setPaymentError("");
      setIsStartingPayment(true);
      localStorage.setItem(PAID_LISTING_CHECKOUT_KEY, JSON.stringify({ formData }));

      const returnUrl = `${window.location.origin}${createPageUrl("CreateListing")}`;
      const response = await base44.functions.invoke("createResidentialListingCheckout", {
        amount_cents: amountCents,
        tier: formData.listingType === "event" ? (formData.event_tier || formData.tier) : formData.tier,
        listing_kind: formData.listingType === "event" ? "event" : "residential",
        customer_email: user?.email,
        return_url: returnUrl,
      });

      console.log("Stripe session created", response?.data);
      const checkoutUrl = response?.data?.checkoutUrl;
      const sessionId = response?.data?.sessionId;
      console.log("Stripe checkout URL/session returned", { checkoutUrl, sessionId });

      if (!checkoutUrl) {
        throw new Error("Payment checkout could not start.");
      }

      console.log("Stripe redirect attempted", checkoutUrl);
      window.location.assign(checkoutUrl);

      setTimeout(() => {
        const link = document.createElement("a");
        link.href = checkoutUrl;
        link.target = "_self";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, 120);
    } catch (error) {
      setIsStartingPayment(false);
      setPaymentError(error?.response?.data?.error || error?.message || "Payment could not start.");
      toast.error(error?.response?.data?.error || error?.message || "Payment could not start.");
    }
  };

  const startNeighborhoodSaleSetup = async () => {
    if (window.self !== window.top) {
      console.warn("Stripe setup blocked inside iframe preview");
      setPaymentError("Stripe setup must be tested from the published app, not the Base44 preview.");
      toast.error("Stripe setup must be tested from the published app, not the Base44 preview.");
      return;
    }

    try {
      setPaymentError("");
      setIsStartingPayment(true);
      localStorage.setItem(NEIGHBORHOOD_SETUP_KEY, JSON.stringify({ formData }));

      const returnUrl = `${window.location.origin}${createPageUrl("CreateListing")}`;
      const response = await base44.functions.invoke("neighborhoodSaleSetupCheckout", {
        return_url: returnUrl,
        customer_id: formData.organizer_stripe_customer_id || undefined,
      });

      const checkoutUrl = response?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("Payment method setup could not start.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      setIsStartingPayment(false);
      setPaymentError(error?.response?.data?.error || error?.message || "Payment method setup could not start.");
      toast.error(error?.response?.data?.error || error?.message || "Payment method setup could not start.");
    }
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
      if (!isAdminCreate && data.listingType === "yard_sale" && hasActiveResidentialListing()) {
        const activeListing = getActiveResidentialListing();
        const listingTitle = activeListing?.title || "Untitled";
        const listingId = activeListing?.listingNumber || activeListing?.id || "Unknown ID";
        throw new Error(`You already have an active listing. End it before creating another. Active listing: ${listingTitle} (${listingId}).`);
      }

      const demoPrefix = isGlobalDemoMode ? "Demo listing: " : "";

      // Generate listing number: STATE + last4zip + dash + 5 random chars
      const stateCode = getStateAbbreviation(data.state || "XX");
      const zipLast4 = (data.zip || "0000").slice(-4).padStart(4, "0");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let rand5 = "";
      for (let i = 0; i < 5; i++) rand5 += chars[Math.floor(Math.random() * chars.length)];
      const listingNumber = `${stateCode}${zipLast4}-${rand5}`;

      const listing = await base44.entities.Listing.create({
        ...data,
        title: demoPrefix + data.title,
        ownerUserId: isAdminCreate ? selectedUserForAdmin?.id : user.id,
        status: data.status || (data.listingType === "neighborhood_sale" ? "collecting_participants" : "active"),
        event_state: data.listingType === "neighborhood_sale" ? (data.event_state || "pending_activation") : data.event_state,
        listingNumber,
        ...(isAdminCreate ? { created_by_admin: true, created_by_admin_id: user.id } : {})
      });

      if (isAdminCreate) {
        const adminSession = getAdminSession();
        await base44.entities.AdminAuditLog.create({
          user_id: user.id,
          admin_employee_id: adminSession?.employee_id || "UNKNOWN",
          action_type: "admin_created_listing",
          target_type: "listing",
          target_id: listing.id,
          success: true,
          metadata: JSON.stringify({
            assigned_user_id: selectedUserForAdmin?.id,
            assigned_user_email: selectedUserForAdmin?.email,
            created_at: new Date().toISOString()
          })
        });
      }

      return listing;
    },
    onSuccess: async (createdListing) => {
      if (createdListing.listingType === "neighborhood_sale") {
        try {
          if (createdListing.organizer_stripe_payment_method_id) {
            const durationDays = Math.max(1, Math.round((new Date(createdListing.endDateTime).getTime() - new Date(createdListing.startDateTime).getTime()) / (1000 * 60 * 60 * 24)) + 1);
            await base44.entities.Payment.create({
              location_id: createdListing.id,
              related_entity_id: createdListing.id,
              user_id: createdListing.ownerUserId,
              amount: 0,
              type: "neighborhood_event",
              plan: "neighborhood_sale_initial",
              duration_days: durationDays,
              status: "pending",
              payment_method: createdListing.organizer_stripe_payment_method_id,
              transaction_id: createdListing.organizer_setup_intent_id || createdListing.organizer_setup_session_id || "",
              stripe_payment_intent_id: "",
              stripe_customer_id: createdListing.organizer_stripe_customer_id || "",
              stripe_payment_method_id: createdListing.organizer_stripe_payment_method_id,
              setup_reference_id: createdListing.organizer_setup_intent_id || createdListing.organizer_setup_session_id || "",
            });
          }

          await base44.functions.invoke("syncNeighborhoodDeadlineJobs", {
            data: createdListing,
            event: { type: "create", entity_id: createdListing.id }
          });

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
            participant_origin_snapshot: "neighborhood_invite"
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

      localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);
      localStorage.removeItem(NEIGHBORHOOD_SETUP_KEY);
      setIsStartingPayment(false);
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["userListings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      sessionStorage.removeItem("yardit_pending_trust_action");
      toast.success("Listing created successfully!");
      navigate(createPageUrl("MyListings"));
    },
    onError: (error) => {
      setIsStartingPayment(false);
      toast.error(error.message || "Failed to create listing");
    }
  });

  const handleNext = async () => {
    if (step === 1) {
      if (formData.listingType === "event") {
        if (!formData.event_name || !formData.event_category) {
          toast.error("Please fill in all required event fields");
          return;
        }
        setStep(2);
        return;
      }

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
      if (formData.listingType === "event") {
        if (!isLocationReadyForSubmission(formData)) {
          toast.error("Please choose a valid event location");
          return;
        }
        setFormData((prev) => {
          const resolved = buildResolvedListingLocation(prev);
          if (isAdminCreate) {
            resolved.location_source = "admin_selected";
          }
          return resolved;
        });
        setStep(3);
        return;
      }

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

      if (!isGlobalDemoMode && !isAdminCreate) {
        if (profileIncomplete) {
          toast.error("Complete your profile to start posting.");
          navigate(createPageUrl("Profile"));
          return;
        }

        if (!isAdminCreate && formData.listingType === "yard_sale" && hasActiveResidentialListing()) {
          const activeListing = getActiveResidentialListing();
          const listingTitle = activeListing?.title || "Untitled";
          const listingId = activeListing?.listingNumber || activeListing?.id || "Unknown ID";
          toast.error(`You already have an active listing: ${listingTitle} (${listingId})`);
          return;
        }

        if (profileAddressUnconfirmed) {
          toast.error("Your address must be confirmed in Settings before you can complete account setup or create a live listing.");
          navigate(createPageUrl("Settings"));
          return;
        }

        let resolvedProfileTimeZoneId = user?.timeZoneId || formData.timeZoneId || "";
        if (!resolvedProfileTimeZoneId && typeof user?.address_lat === "number" && typeof user?.address_lng === "number") {
          resolvedProfileTimeZoneId = resolveTimeZoneFromCoordinates(user.address_lat, user.address_lng) || "";
          if (resolvedProfileTimeZoneId) {
            await base44.auth.updateMe({ timeZoneId: resolvedProfileTimeZoneId });
            setUser((prev) => prev ? { ...prev, timeZoneId: resolvedProfileTimeZoneId } : prev);
          }
        }

        const nextData = buildResolvedListingLocation({
          ...formData,
          addressText: user.primary_address,
          city: user.city,
          state: (user.state || "").toUpperCase().slice(0, 2),
          zip: user.zip_code,
          lat: user.primary_latitude,
          lng: user.primary_longitude,
          timeZoneId: resolvedProfileTimeZoneId,
          locationMethod: "verified_primary_address"
        });
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

      if (profileIncomplete && !isAdminCreate) {
        toast.error("Complete your profile to start posting.");
        navigate(createPageUrl("Profile"));
        return;
      }

      if (!formData.addressText || !formData.city || !formData.state || !formData.zip) {
        toast.error("Address is still loading. Please wait a moment and try again.");
        return;
      }

      if (!geocodeRef || typeof geocodeRef !== "function") {
        toast.error("Please use 'Locate Address' to confirm your location");
        return;
      }

      const geocodeResult = await geocodeRef();
      if (!geocodeResult) {
        return;
      }

      const overrideLocation = typeof geocodeResult === "object" ? geocodeResult : null;
      const nextData = overrideLocation ? { ...formData, ...overrideLocation } : formData;

      const normalizedNextData = buildResolvedListingLocation(nextData);

      if (isAdminCreate) {
        normalizedNextData.location_source = "admin_selected";
      }

      setFormData(normalizedNextData);

      const nearbySale = await findNearbyNeighborhoodSale(normalizedNextData);
      if (nearbySale) {
        setMatchedSale(nearbySale);
        setSaleModalStep(1);
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3 && formData.listingType === "event") {
      const scheduleValidation = getEventScheduleValidation(formData);
      if (!scheduleValidation.hasRequiredFields) {
        toast.error("Please complete the event start/end dates and times");
        return;
      }
      if (scheduleValidation.errors.length > 0) {
        toast.error(scheduleValidation.errors[0]);
        return;
      }
      setStep(4);
      return;
    }

  };

  const executeSubmit = (actionStr = joinAction, sourceFormData = formData) => {
    let payload = { ...sourceFormData, timeZoneId: sourceFormData.timeZoneId || "" };

    if (isAdminCreate) {
      payload.location_source = "admin_selected";
    }

    if (payload.listingType === "event") {
      payload = {
        ...payload,
        title: payload.event_name,
        description: payload.event_description || "",
        category: payload.event_category,
        tier: payload.event_tier || payload.tier || "basic",
        event_tier: payload.event_tier || payload.tier || "basic",
        photoUrls: payload.event_photos || payload.photoUrls || [],
        display_address: payload.display_address || payload.address_text || payload.addressText,
        geocoded_address: payload.geocoded_address || "",
        location_source: payload.location_source || "search",
        addressText: payload.display_address || payload.address_text || payload.addressText,
        address_text: payload.display_address || payload.address_text || payload.addressText,
        startDateTime: payload.start_datetime ? new Date(payload.start_datetime).toISOString() : payload.startDateTime,
        endDateTime: payload.end_datetime ? new Date(payload.end_datetime).toISOString() : payload.endDateTime,
        start_datetime: payload.start_datetime ? new Date(payload.start_datetime).toISOString() : payload.startDateTime,
        end_datetime: payload.end_datetime ? new Date(payload.end_datetime).toISOString() : payload.endDateTime,
        status: "active",
        pricePaid: Number(EVENT_TIER_PRICES[payload.event_tier || payload.tier] || 0) / 100,
      };
    }

    if (payload.listingType === "yard_sale" && !isGlobalDemoMode && !isAdminCreate) {
      const selectedDistanceFeet = getDistanceFeet(payload.lat, payload.lng, user.primary_latitude, user.primary_longitude);
      if (selectedDistanceFeet > 500) {
        throw new Error("Your listing must use your verified primary address. You can adjust the pin slightly for map accuracy.");
      }

      payload = {
        ...payload,
        addressText: user.primary_address,
        city: user.city,
        state: getStateAbbreviation(user.state || ""),
        zip: user.zip_code,
        lat: typeof payload.lat === "number" ? payload.lat : user.primary_latitude,
        lng: typeof payload.lng === "number" ? payload.lng : user.primary_longitude,
        timeZoneId: user?.timeZoneId || payload.timeZoneId || "",
        locationMethod: "verified_primary_address",
      };
    }

    if (payload.listingType === "neighborhood_sale") {
      const startDateTime = new Date(sourceFormData.selectedRangeStartDate + "T00:00:00Z").toISOString();
      const endDateTime = new Date(sourceFormData.selectedRangeEndDate + "T23:59:59Z").toISOString();
      const holdDeadlineAt = new Date(new Date(startDateTime).getTime() - 24 * 60 * 60 * 1000).toISOString();

      payload.spanFeet = 500;
      payload.tier = "neighborhood_tier";
      payload.category = "Neighborhood Sale";
      payload.categories = [];
      payload.description = payload.description || "";
      payload.startDateTime = startDateTime;
      payload.endDateTime = endDateTime;
      payload.hold_deadline_at = holdDeadlineAt;
      payload.invite_code = sourceFormData.invite_code || sourceFormData.neighborhoodDraftId;
      payload.status = "collecting_participants";
      payload.activation_status = "pending";
      payload.event_state = "pending_activation";
      payload.homeCount = 1;
      payload.pricePaid = 0;
      payload.payment_intent_status = "none";
      payload.payment_setup_status = sourceFormData.organizer_stripe_payment_method_id ? "saved" : "pending";
      payload.organizer_stripe_customer_id = sourceFormData.organizer_stripe_customer_id || "";
      payload.organizer_stripe_payment_method_id = sourceFormData.organizer_stripe_payment_method_id || "";
      payload.organizer_setup_session_id = sourceFormData.organizer_setup_session_id || "";
      payload.organizer_setup_intent_id = sourceFormData.organizer_setup_intent_id || "";
      payload.neighborhood_payment_retry_count = 0;
      payload.addressText = sourceFormData.host_addressText || payload.addressText;
      payload.city = sourceFormData.host_city || payload.city;
      payload.state = sourceFormData.host_state || payload.state;
      payload.zip = sourceFormData.host_zip || payload.zip;
      if (sourceFormData.payment_method_collected_at) {
        payload.payment_method_collected_at = sourceFormData.payment_method_collected_at;
      }
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

    if (payload.tier === "free" && actionStr !== "requested") {
      const freeWindow = computeFreeWindow(new Date(), payload.timeZoneId);
      payload = {
        ...payload,
        startDateTime: freeWindow.effectiveStart.toISOString(),
        endDateTime: freeWindow.effectiveEnd.toISOString(),
        selectedRangeStartDate: freeWindow.startDateTime.toLocaleDateString("en-CA", { timeZone: payload.timeZoneId }),
        selectedRangeEndDate: freeWindow.endDateTime.toLocaleDateString("en-CA", { timeZone: payload.timeZoneId }),
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: []
      };
    }

    if (sourceFormData.tier === "featured" && payload.listingType !== "event") {
      const startLocal = new Date(`${sourceFormData.selectedRangeStartDate}T00:00:00`);
      let activeDates = [];
      const pad = (n) => String(n).padStart(2, "0");
      for (let i = 0; i < 3; i++) {
        const d = new Date(startLocal);
        d.setDate(d.getDate() + i);
        activeDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }

      payload = {
        ...payload,
        startDateTime: new Date(`${sourceFormData.selectedRangeStartDate}T00:00:00Z`).toISOString(),
        endDateTime: new Date(`${sourceFormData.selectedRangeEndDate}T23:59:59Z`).toISOString(),
        activeDates,
        earlyVisibilityDays: 0,
        earlyVisibilityDates: []
      };
    }

    if (sourceFormData.tier === "premium" && payload.listingType !== "event") {
      const earlyDays = Math.max(0, Math.min(3, Number(sourceFormData.earlyVisibilityDays || 0)));
      const startLocal = new Date(`${sourceFormData.selectedRangeStartDate}T00:00:00`);
      const endLocal = new Date(`${sourceFormData.selectedRangeEndDate}T00:00:00`);
      const diffDays = Math.round((endLocal - startLocal) / (1000 * 60 * 60 * 24)) + 1;

      let earlyVisibilityStartDateTime = null;
      let earlyVisibilityDates = [];
      let activeDates = [];
      const pad = (n) => String(n).padStart(2, "0");

      for (let i = 0; i < diffDays; i++) {
        const d = new Date(startLocal);
        d.setDate(d.getDate() + i);
        activeDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }

      if (earlyDays > 0) {
        const startDt = new Date(startLocal);
        startDt.setDate(startDt.getDate() - earlyDays);
        earlyVisibilityStartDateTime = startDt.toISOString();

        for (let i = 0; i < earlyDays; i++) {
          const d = new Date(startDt);
          d.setDate(d.getDate() + i);
          earlyVisibilityDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        }
      }

      payload = {
        ...payload,
        startDateTime: new Date(`${sourceFormData.selectedRangeStartDate}T00:00:00Z`).toISOString(),
        endDateTime: new Date(`${sourceFormData.selectedRangeEndDate}T23:59:59Z`).toISOString(),
        earlyVisibilityDays: earlyDays,
        earlyVisibilityDates,
        activeDates,
        ...(earlyVisibilityStartDateTime && { earlyVisibilityStartDateTime })
      };
    }

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

    if (actionStr === "paid_success" && payload.listingType === "event") {
      payload.status = "active";
      payload.pricePaid = Number(EVENT_TIER_PRICES[payload.event_tier || payload.tier] || 0) / 100;
    }

    if (actionStr === "paid_success" && ["featured", "premium"].includes(payload.tier) && payload.listingType !== "event") {
      payload.status = "scheduled";
      payload.pricePaid = (RESIDENTIAL_TIER_PRICES[payload.tier] || 0) / 100;
    }

    if (isGlobalDemoMode) {
      payload.is_demo_listing = true;
      payload.payment_intent_status = "none";
    }

    createListingMutation.mutate(payload);
  };

  const handlePaymentStepSubmit = async () => {
    if (isGlobalDemoMode) {
      setPaymentError("");
      setIsStartingPayment(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsStartingPayment(false);
      toast.success("Demo payment successful.");
      executeSubmit("paid_success");
      return;
    }

    await startPaidListingCheckout();
  };

  const handleNeighborhoodSetupSubmit = async () => {
    if (isGlobalDemoMode) {
      setPaymentError("");
      setIsStartingPayment(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const demoSetupData = formData.organizer_stripe_payment_method_id
        ? formData
        : {
            ...formData,
            organizer_stripe_customer_id: `demo_cus_${Date.now()}`,
            organizer_stripe_payment_method_id: `demo_pm_${Date.now()}`,
            organizer_setup_session_id: `demo_session_${Date.now()}`,
            organizer_setup_intent_id: `demo_setup_${Date.now()}`,
            payment_setup_status: "saved",
            payment_method_collected_at: new Date().toISOString(),
          };

      if (!formData.organizer_stripe_payment_method_id) {
        setFormData(demoSetupData);
      }

      setIsStartingPayment(false);
      toast.success("Demo payment method saved.");
      executeSubmit(undefined, demoSetupData);
      return;
    }

    if (!formData.organizer_stripe_payment_method_id || !formData.organizer_stripe_customer_id) {
      await startNeighborhoodSaleSetup();
      return;
    }

    executeSubmit();
  };

  const handleSubmit = async () => {
    if (!isAdminCreate && formData.listingType === "yard_sale" && hasActiveResidentialListing()) {
      toast.error("You already have an active listing. End it before creating another.");
      return;
    }

    if (formData.listingType === "event") {
      const scheduleValidation = getEventScheduleValidation(formData);
      if (!scheduleValidation.hasRequiredFields) {
        toast.error("Please complete the event start/end dates and times");
        return;
      }
      if (scheduleValidation.errors.length > 0) {
        toast.error(scheduleValidation.errors[0]);
        return;
      }
      setPaymentError("");
      setStep(5);
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

    if (formData.listingType === "neighborhood_sale") {
      setPaymentError("");
      setStep(4);
      return;
    }

    if (!formData.tier) {
      toast.error("Please select a tier");
      return;
    }

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

    const photoCheck = enforcePhotoLimit(formData.tier, formData.photoUrls || []);
    if (photoCheck.truncated) {
      toast.error(`Too many photos for ${formData.tier}. Max allowed: ${photoCheck.max}.`);
      return;
    }

    if (isAdminCreate) {
      setStep(entryStepNumber + 1);
      return;
    }

    if (formData.listingType !== "neighborhood_sale" && ["featured", "premium"].includes(formData.tier)) {
      setPaymentError("");
      setStep(4);
      return;
    }

    executeSubmit();
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const setupState = params.get("neighborhoodSetup");
    const sessionId = params.get("session_id");
    if (!setupState) return;

    const raw = localStorage.getItem(NEIGHBORHOOD_SETUP_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw);
      if (stored?.formData) {
        setFormData(stored.formData);
        setStep(3);
      }

      window.history.replaceState({}, "", createPageUrl("CreateListing"));

      if (setupState === "cancel") {
        localStorage.removeItem(NEIGHBORHOOD_SETUP_KEY);
        setIsStartingPayment(false);
        setPaymentError("Payment method setup was canceled. Neighborhood Sale was not created.");
        toast.error("Payment method setup was canceled. Neighborhood Sale was not created.");
        return;
      }

      if (setupState === "success" && sessionId && handledNeighborhoodSetupSessionRef.current !== sessionId && stored?.formData) {
        if (!user?.id) return;
        handledNeighborhoodSetupSessionRef.current = sessionId;

        base44.functions.invoke("neighborhoodSaleSetupCheckout", {
          action: "verify",
          session_id: sessionId,
        }).then((response) => {
          if (response?.data?.saved && response?.data?.customerId && response?.data?.paymentMethodId) {
            localStorage.removeItem(NEIGHBORHOOD_SETUP_KEY);
            const updatedFormData = {
              ...stored.formData,
              organizer_stripe_customer_id: response.data.customerId,
              organizer_stripe_payment_method_id: response.data.paymentMethodId,
              organizer_setup_session_id: sessionId,
              organizer_setup_intent_id: response.data.setupIntentId,
              payment_setup_status: "saved",
              payment_method_collected_at: new Date().toISOString(),
            };
            setFormData(updatedFormData);
            setPaymentError("");
            toast.success("Payment method saved for your Neighborhood Sale.");
            executeSubmit(undefined, updatedFormData);
          } else {
            setIsStartingPayment(false);
            setPaymentError("Payment method setup could not be confirmed. Neighborhood Sale was not created.");
            toast.error("Payment method setup could not be confirmed. Neighborhood Sale was not created.");
          }
        }).catch((error) => {
          setIsStartingPayment(false);
          setPaymentError(error?.response?.data?.error || error?.message || "Payment method setup verification failed.");
          toast.error(error?.response?.data?.error || error?.message || "Payment method setup verification failed.");
        });
      }
    } catch {
      localStorage.removeItem(NEIGHBORHOOD_SETUP_KEY);
    }
  }, [location.search, user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentState = params.get("payment");
    const sessionId = params.get("session_id");
    if (!paymentState) return;

    const raw = localStorage.getItem(PAID_LISTING_CHECKOUT_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw);
      if (stored?.formData) {
        setFormData(stored.formData);
        setStep(stored.formData?.listingType === "event" ? 5 : 4);
      }

      window.history.replaceState({}, "", createPageUrl("CreateListing"));

      if (paymentState === "cancel") {
        console.log("Return from Stripe cancel");
        setIsStartingPayment(false);
        setPaymentError("Payment was canceled. No listing was created.");
        toast.error("Payment was canceled. No listing was created.");
        return;
      }

      if (paymentState === "success" && sessionId && handledCheckoutSessionRef.current !== sessionId && stored?.formData) {
        console.log("Return from Stripe success", sessionId);
        if (!user?.id) return;
        handledCheckoutSessionRef.current = sessionId;
        localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);

        base44.functions.invoke("createResidentialListingCheckout", {
          action: "verify",
          session_id: sessionId,
        }).then((response) => {
          if (response?.data?.paid) {
            setPaymentError("");
            toast.success("Payment successful.");
            executeSubmit("paid_success", stored.formData);
          } else {
            setIsStartingPayment(false);
            setPaymentError("Payment could not be confirmed. No listing was created.");
            toast.error("Payment could not be confirmed. No listing was created.");
          }
        }).catch((error) => {
          setIsStartingPayment(false);
          setPaymentError(error?.response?.data?.error || error?.message || "Payment verification failed.");
          toast.error(error?.response?.data?.error || error?.message || "Payment verification failed.");
        });
      }
    } catch {
      localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);
    }
  }, [location.search, user?.id]);

  useEffect(() => {
    if (step !== 3 || formData.listingType !== "yard_sale") return;
    console.log("[RELIST_DEBUG] current formData tier before Tier & Review renders", {
      currentFormDataTier: formData.tier,
    });
  }, [step, formData.listingType, formData.tier]);

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const shouldRequirePrimaryAddress = !isAdminCreate && !isGlobalDemoMode && !canPerformTrustAction(user);

  if (shouldRequirePrimaryAddress) {
    sessionStorage.setItem("yardit_pending_trust_action", JSON.stringify({ returnTo: window.location.href, action: "create_listing", createdAt: Date.now() }));
    return <PrimaryAddressVerificationGate user={user} onVerified={(updatedUser) => setUser((prev) => ({ ...prev, ...updatedUser }))} />;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {(isEventFlow ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map((s) => (
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
                {s < (isEventFlow ? 5 : 4) && (
                  <div
                    key={`line-${s}`}
                    className={`w-12 h-1 ${s < step ? "bg-green-600" : "bg-slate-200"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center gap-4 md:gap-8 text-xs text-slate-600 flex-wrap">
            {(isEventFlow
              ? ["Details", "Location", "Date & Time", "Tier", isAdminCreate ? "Assign User" : "Payment"]
              : ["Details", "Location & Time", "Tier & Review", isAdminCreate ? "Assign User" : "Payment"]
            ).map((label, index) => (
              <span key={label} className={step === index + 1 ? "font-semibold" : ""}>{label}</span>
            ))}
          </div>
          {formData.listingType === "yard_sale" && (
             <div className="mt-5 flex justify-center">
                <button type="button" onClick={() => setShowGuideModal(true)} className="text-sm text-teal-600 font-medium hover:text-teal-800 underline underline-offset-2 transition-colors">
                   Need tips for a great sale? View our Success Guide & Checklist
                </button>
             </div>
          )}
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-800 text-white">
            <CardTitle>{isAdminCreate ? "Create Listing (Admin)" : (formData.listingType === "event" ? "Create Event" : "Post Your Yard Sale")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6" ref={formContainerRef}>
            <FormScrollHelper containerRef={formContainerRef} />

            {formData.listingType === "neighborhood_sale" && (
              <div className="mb-4 p-3 bg-[#e7d7b8]/50 border border-[#2C4F4E]/20 rounded-md text-[#2C4F4E] text-sm font-medium">
                Neighborhood Sale: Up to 25 homes within 500 feet.
              </div>
            )}

            {step === 1 && (formData.listingType === "event" ? <EventDetailsStep formData={formData} setFormData={setFormData} /> : <StepOne formData={formData} setFormData={setFormData} />)}
            {step === 2 && (
              formData.listingType === "event"
                ? <EventLocationStep formData={formData} setFormData={setFormData} />
                : <StepTwo formData={formData} setFormData={setFormData} onGeocodeRef={setGeocodeRef} user={user} />
            )}
            {step === 3 && (formData.listingType === "event" ? <EventScheduleStep formData={formData} setFormData={setFormData} /> : <StepThree formData={formData} setFormData={setFormData} />)}
            {step === 4 && formData.listingType === "event" && (
              <div className="space-y-6">
                <EventTierStep formData={formData} setFormData={setFormData} />
                {(formData.event_tier || formData.tier) === "marquee" && (
                  <MarqueeSlotsEditor
                    value={formData.marquee_schedule_slots || []}
                    onChange={(slots) => setFormData((prev) => ({ ...prev, marquee_schedule_slots: slots }))}
                    eventStartDate={formData.event_start_date}
                    eventEndDate={formData.event_end_date}
                  />
                )}
              </div>
            )}
            {step === 4 && formData.listingType !== "neighborhood_sale" && formData.listingType !== "event" && (
              isAdminCreate ? (
                <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />
              ) : (
              <ResidentialPaymentStep
                tier={formData.tier}
                amount={(RESIDENTIAL_TIER_PRICES[formData.tier] || 0) / 100}
                isDemoMode={isGlobalDemoMode}
                isProcessing={isStartingPayment}
                errorMessage={paymentError}
                onBack={() => {
                  setPaymentError("");
                  setStep(3);
                }}
                onPay={handlePaymentStepSubmit}
              />
              )
            )}
            {step === 5 && formData.listingType === "event" && (
              isAdminCreate ? (
                <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />
              ) : (
              <ResidentialPaymentStep
                tier={formData.event_tier}
                amount={(EVENT_TIER_PRICES[formData.event_tier] || 0) / 100}
                isDemoMode={isGlobalDemoMode}
                isProcessing={isStartingPayment}
                errorMessage={paymentError}
                onBack={() => {
                  setPaymentError("");
                  setStep(4);
                }}
                onPay={handlePaymentStepSubmit}
              />
              )
            )}
            {step === 4 && formData.listingType === "neighborhood_sale" && (
              isAdminCreate ? (
                <AdminAssignUserStep selectedUser={selectedUserForAdmin} setSelectedUser={setSelectedUserForAdmin} />
              ) : (
              <NeighborhoodSetupStep
                isProcessing={isStartingPayment}
                errorMessage={paymentError}
                onBack={() => {
                  setPaymentError("");
                  setStep(3);
                }}
                onSetup={handleNeighborhoodSetupSubmit}
              />
              )
            )}

            {(step !== paymentStepNumber || isAdminCreate) && <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  Back
                </Button>
              )}
              {(isAdminCreate ? step < paymentStepNumber : step < entryStepNumber) ? (
                <Button
                  onClick={isAdminCreate && step === entryStepNumber ? () => setStep(paymentStepNumber) : handleNext}
                  disabled={step === 2 && formData.listingType !== "neighborhood_sale" && formData.listingType !== "event" && (isGlobalDemoMode ? (profileAddressMissing || regularAddressIncomplete) : profileAddressUnconfirmed)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={isAdminCreate && step === paymentStepNumber ? () => {
                    if (!selectedUserForAdmin) {
                      toast.error("Please assign a user.");
                      return;
                    }
                    executeSubmit("admin_create");
                  } : handleSubmit}
                  disabled={createListingMutation.isPending || isStartingPayment}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {isStartingPayment
                    ? formData.listingType === "neighborhood_sale"
                      ? "Saving Payment Method..."
                      : "Starting Payment..."
                    : createListingMutation.isPending
                    ? "Creating..."
                    : isAdminCreate && step === paymentStepNumber
                    ? "Create Listing (Admin)"
                    : isAdminCreate && step === entryStepNumber
                    ? "Continue to Assign User"
                    : formData.listingType === "event"
                    ? "Continue to Payment"
                    : formData.listingType === "neighborhood_sale"
                    ? "Continue to Payment Setup"
                    : ["featured", "premium"].includes(formData.tier)
                    ? "Continue to Payment"
                    : "Create Listing"}
                </Button>
              )}
            </div>}
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
      <YardSaleGuideModal open={showGuideModal} onOpenChange={setShowGuideModal} />
    </div>
  );
}