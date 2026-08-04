import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAdminSession } from "../components/admin/AdminLoginModal";

import NeighborhoodIntroModal from "../components/create/NeighborhoodIntroModal";
import FormScrollHelper from "../components/create/FormScrollHelper";
import CreateListingResidential from "../components/create/CreateListingResidential";
import CreateListingNeighborhood from "../components/create/CreateListingNeighborhood";
import CreateListingEvent from "../components/create/CreateListingEvent";
import ConfirmHomeAddressModal from "../components/create/ConfirmHomeAddressModal";
import ResidentialListingConflictDialog from "@/components/create/ResidentialListingConflictDialog";
import { clearStaleTrustProgress, hasVerifiedPrimaryAddress } from "@/lib/trustActions";
import { normalizeUser } from "@/lib/normalizeUser";
import { useAppMode } from "../components/shared/DemoMode";
import DemoPaymentSkipDialog from "@/components/shared/DemoPaymentSkipDialog";
import YardSaleGuideModal from "../components/guide/YardSaleGuideModal";
import {
  getNeighborhoodCreationLeadTimeError,
  normalizeNeighborhoodJoinStatus,
} from "@/lib/neighborhoodSaleState";

// Tier Engine (shared business logic)
import {
  computeFreeWindow,
  computeFeaturedDates,
  computePremiumDates,
  enforcePhotoLimit,
  getPhotoLimitByTier,
  zonedDateTimeToUtcDate
} from "../components/shared/listingTierEngine";
import {
  getReservedDatesForAddress,
  hasDateConflict,
  findConflictingReservedListingForAddress,
} from "@/lib/residentialDateConflict";
import { getResidentialEventPriceBreakdown } from "@/lib/eventListingConfig";
import { getEventScheduleValidation } from "@/lib/eventSchedule";
import { normalizeResidentialEventSingleDay } from "@/lib/residentialEventSchedule";
import { getResidentialDescriptionLimitError } from "@/lib/residentialDescriptionLimits";
import { buildResolvedListingLocation, isLocationReadyForSubmission, resolveTimeZoneFromCoordinates, getStateAbbreviation } from "@/lib/listingLocation";

const RELIST_STORAGE_KEY = "yardit_relist_prefill_v1";
const DRAFT_RESUME_STORAGE_KEY = "yardit_listing_draft_resume_v1";
const PAID_LISTING_CHECKOUT_KEY = "yardit_paid_listing_checkout_v1";
const NEIGHBORHOOD_SETUP_KEY = "yardit_neighborhood_setup_v1";
const NEIGHBORHOOD_INTRO_HIDE_KEY = "yardit_hide_neighborhood_sale_intro";
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

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getOpenHoursError(data) {
  const openMinutes = minutesFromTime(data.openTime);
  const closeMinutes = minutesFromTime(data.closeTime);
  const earliest = 5 * 60;
  const latest = 22 * 60;

  if (openMinutes === null) return "Please select an open time";
  if (closeMinutes === null) return "Please select a close time";
  if (openMinutes < earliest) return "Open Time cannot be earlier than 5:00 AM";
  if (closeMinutes > latest) return "Close Time cannot be later than 10:00 PM";
  if (openMinutes >= closeMinutes) return "Open Time must be before Close Time";
  return "";
}

function getTodayYmd() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function localYmdFromIso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hasPastSelectedDates(data) {
  const today = getTodayYmd();
  return Boolean(
    (data?.selectedRangeStartDate && data.selectedRangeStartDate < today) ||
    (data?.selectedRangeEndDate && data.selectedRangeEndDate < today)
  );
}

function hasListingDraftContent(data) {
  if (data?.listingType === "event") {
    return Boolean(
      data.event_name ||
      data.event_description ||
      data.event_category ||
      data.display_address ||
      data.address_text ||
      data.event_start_date ||
      data.event_start_time ||
      Object.keys(data.event_add_ons || {}).length
    );
  }

  if (!["yard_sale", "neighborhood_sale"].includes(data?.listingType)) return false;
  return Boolean(data.title || data.description || data.addressText || data.selectedRangeStartDate || data.selectedRangeEndDate || data.categories?.length || data.category);
}

export default function CreateListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToLogin } = useAuth();
  const queryClient = useQueryClient();
  const formContainerRef = useRef(null);

  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showNeighborhoodIntro, setShowNeighborhoodIntro] = useState(false);
  const [geocodeRef, setGeocodeRef] = useState(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [demoPaymentRequest, setDemoPaymentRequest] = useState(null);
  const handledCheckoutSessionRef = useRef(null);
  const handledNeighborhoodSetupSessionRef = useRef(null);
  const recoveringPaidCheckoutRef = useRef(false);
  const [hasUserInteractedWithDates, setHasUserInteractedWithDates] = useState(false);
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);
  const [residentialConflict, setResidentialConflict] = useState(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [step]);

  const [showHomeAddressConfirm, setShowHomeAddressConfirm] = useState(false);
  const [pendingHomeAddress, setPendingHomeAddress] = useState(null);
  const [isConfirmingHomeAddress, setIsConfirmingHomeAddress] = useState(false);

  const isAdminCreate = new URLSearchParams(location.search).get("adminCreate") === "1";
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState(null);

  useEffect(() => {
    if (isAdminCreate && user && !["master", "supervisor"].includes(user.role)) {
      toast.error("You do not have permission to use Admin Create Listing.");
      navigate(createPageUrl("AdminLite"));
    }
  }, [isAdminCreate, user, navigate]);

  const [activeRescue, setActiveRescue] = useState(null);

  const [formData, setFormData] = useState({
    listingType: "yard_sale",
    tier: "featured",
    event_tier: "event",
    event_add_ons: {},
    event_animation: "",
    event_flyer_url: "",
    event_photo_gallery_count: 0,
    coming_soon_package: "",
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
    openTime: "",
    closeTime: "",

    // Date-range selection (YYYY-MM-DD strings)
    selectedRangeStartDate: "",
    selectedRangeEndDate: "",

    // Premium Early Visibility
    earlyVisibilityDays: 0,
    earlyVisibilityDates: [],
    activeDates: [],
    early_visibility_enabled: false,
    early_visibility_days: 0,
    visibility_start_date: "",
    early_visibility_promo_code: "",

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
    locationMethod: "address",
    organizer_participation: "participating",
    fallback_action: "",
    fallback_listing_id: "",
    fallback_consent_at: "",
    discovery_promo_code: ""
  });

  useEffect(() => {
    const requestedStep = getRequestedStep(location.search);
    if (requestedStep) {
      setStep(requestedStep);
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const promoCode = params.get("promo");
    if (!promoCode) return;
    const normalizedPromoCode = promoCode.toUpperCase();
    const requestedTier = params.get("tier");
    const preferredTier = requestedTier === "premium" ? "premium" : "featured";
    let cancelled = false;

    const applyMapPromo = async () => {
      const promos = await base44.entities.ResidentialPromoCode.filter({ code: normalizedPromoCode });
      const promo = promos?.[0];
      if (cancelled) return;
      setFormData((prev) => ({
        ...prev,
        listingType: "yard_sale",
        tier: preferredTier,
        discovery_promo_code: normalizedPromoCode,
        discovery_promo_title: promo?.title || "",
        discovery_promo_starts_at: promo?.starts_at || "",
        discovery_promo_expires_at: promo?.expires_at || "",
        selectedRangeStartDate: promo?.starts_at ? localYmdFromIso(promo.starts_at) : prev.selectedRangeStartDate,
        selectedRangeEndDate: promo?.expires_at ? localYmdFromIso(promo.expires_at) : prev.selectedRangeEndDate,
      }));
      if (params.get("promoSource") === "map") {
        toast.success("Promo applied.");
      }
    };

    applyMapPromo();
    return () => { cancelled = true; };
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("draft") !== "1") return;

    const raw = localStorage.getItem(DRAFT_RESUME_STORAGE_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (!draft?.formData) return;
      const restoredFormData = normalizeResidentialEventSingleDay({ ...draft.formData });
      setActiveDraftId(draft.draftId || null);
      setFormData((prev) => normalizeResidentialEventSingleDay({ ...prev, ...restoredFormData }));
      localStorage.removeItem(DRAFT_RESUME_STORAGE_KEY);
      if (hasPastSelectedDates(draft.formData)) {
        setStep(draft.formData.listingType === "event" ? 3 : 3);
        toast.warning("This draft has dates that have already passed. Please choose new dates before continuing.");
      } else {
        setStep(draft.step || (draft.formData.listingType === "event" ? 5 : draft.formData.listingType === "neighborhood_sale" ? 4 : 3));
        toast.success("Draft loaded — you can finish where you left off.");
      }
    } catch {
      localStorage.removeItem(DRAFT_RESUME_STORAGE_KEY);
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

          // Step 4 — Add-ons: convert old event tiers into the new add-on model
          event_tier: "event",
          tier: "event",
          event_add_ons: {
            ...(pre.event_add_ons || {}),
            premium_visibility: pre.event_add_ons?.premium_visibility || ["premium", "marquee"].includes(pre.event_tier),
            flyer_upload: pre.event_add_ons?.flyer_upload || Boolean(pre.event_flyer_url || pre.marquee_flyer_url),
            custom_icon: pre.event_add_ons?.custom_icon || Boolean(pre.event_logo_url),
            marquee: pre.event_add_ons?.marquee || pre.event_tier === "marquee",
          },
          event_flyer_url: pre.event_flyer_url || pre.marquee_flyer_url || "",
          event_photo_gallery_count: pre.event_photo_gallery_count || Math.min(10, pre.event_photos?.length || 0),

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
          activeDates: [],
          early_visibility_enabled: false,
          early_visibility_days: 0,
          visibility_start_date: "",
          early_visibility_promo_code: ""
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
        early_visibility_enabled: false,
        early_visibility_days: 0,
        visibility_start_date: "",
        early_visibility_promo_code: "",
      }));
      setStep(3);
      toast.success("Neighborhood rescue loaded — choose a tier to keep your sale live.");
    };

    loadRescue();
  }, [location.search, user?.id]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        clearStaleTrustProgress();
        const currentUser = normalizeUser(await base44.auth.me());
        setUser(currentUser);
      } catch (error) {
        navigateToLogin();
      }
    };
    fetchUser();
  }, [navigateToLogin]);

  const { isDemoMode: isAdminDemoMode } = useAppMode();
  const userHasVerifiedPrimaryAddress = hasVerifiedPrimaryAddress(user) && typeof (user?.primary_latitude ?? user?.address_lat) === "number" && typeof (user?.primary_longitude ?? user?.address_lng) === "number";
  const profileAddressMissing = !userHasVerifiedPrimaryAddress;
  const profileAddressUnconfirmed = !userHasVerifiedPrimaryAddress;
  const profileIncomplete = user?.email_verified === false;
  const regularAddressIncomplete = !formData.addressText || !formData.city || !formData.state || !formData.zip;

  // Pull all user listings (used for “1 active listing” rule)
  const { data: userListings } = useQuery({
    queryKey: ["userListings", user?.id],
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }),
    enabled: !!user,
    initialData: []
  });

  // Neighborhood Sale discovery is shown during residential tier selection.

  const isEventFlow = formData.listingType === "event";
  const paymentStepNumber = isEventFlow ? 5 : 4;
  const entryStepNumber = isEventFlow ? 4 : 3;

  // Compute reserved dates for residential listings only (drives calendar blocking)
  const addressRef = user ? { lat: user.primary_latitude, lng: user.primary_longitude } : null;
  const reservedDates = React.useMemo(
    () => (formData.listingType === "yard_sale" && !isAdminDemoMode && !isDevBypassUser(user) && addressRef
      ? getReservedDatesForAddress(userListings, null, addressRef)
      : new Set()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.listingType, userListings, user?.primary_latitude, user?.primary_longitude, isAdminDemoMode]
  );

  const debugResidentialDateConflict = (reason, details = {}) => {
    if (!import.meta.env?.DEV) return;
    console.debug("[Residential date conflict]", {
      reason,
      listingType: details.listingType || formData.listingType,
      selectedRangeStartDate: details.startDate,
      selectedRangeEndDate: details.endDate,
      addressRef,
      lat: formData.lat,
      lng: formData.lng,
      conflictingListingId: details.conflict?.listing?.id || null,
      conflictingListingNumber: details.conflict?.listing?.listingNumber || null,
      conflictingDates: details.conflict?.conflictingDates || [],
    });
  };

  // Returns true if the proposed dates conflict with any reserved listing for this address
  const hasResidentialDateConflict = (startDate, endDate, listingType = formData.listingType) => {
    if (listingType !== "yard_sale") {
      debugResidentialDateConflict("skipped_non_residential_listing_type", { startDate, endDate, listingType });
      return false;
    }
    if (!startDate || !endDate || isAdminDemoMode || isDevBypassUser(user) || isAdminCreate) return false;

    const conflict = findConflictingReservedListingForAddress(userListings, startDate, endDate, null, addressRef);
    const hasConflict = hasDateConflict(startDate, endDate, reservedDates);
    if (hasConflict) debugResidentialDateConflict("toast_ready_after_user_action", { startDate, endDate, listingType, conflict });
    return hasConflict;
  };

  // Live-fetch version used in mutation and Stripe-return handler (avoids stale cache)
  const checkDateConflictLive = async (startDate, endDate, listingType = formData.listingType, sourceData = formData) => {
    if (listingType !== "yard_sale") {
      debugResidentialDateConflict("skipped_live_non_residential_listing_type", { startDate, endDate, listingType });
      return false;
    }
    if (!startDate || !endDate || isAdminDemoMode || isDevBypassUser(user) || isAdminCreate) return false;
    const response = await base44.functions.invoke("manageResidentialAccessRequest", {
      action: "check_conflict",
      data: { ...sourceData, listingType, selectedRangeStartDate: startDate, selectedRangeEndDate: endDate },
    });
    if (response?.data?.has_conflict) {
      setResidentialConflict(response.data);
      debugResidentialDateConflict("global_conflict_found", { startDate, endDate, listingType, conflict: response.data });
      return true;
    }
    setResidentialConflict(null);
    return false;
  };

  const markResidentialConflictInteraction = () => {
    if (formData.listingType === "yard_sale") {
      setHasUserInteractedWithDates(true);
    }
  };

  const getHomeAddressLabel = (a = formData) => a?.selected_geocode_place_name || a?.geocoded_address || [a?.addressText, a?.city, getStateAbbreviation(a?.state || ""), a?.zip].filter(Boolean).join(", ");

  const saveBackedOutDraft = async (sourceFormData, draftStep) => {
    if (!user?.id || isAdminCreate || !sourceFormData?.listingType) return null;

    const listingType = sourceFormData.listingType;
    const title = sourceFormData.event_name || sourceFormData.title || (listingType === "event" ? "Event draft" : listingType === "neighborhood_sale" ? "Neighborhood Sale draft" : "Yard Sale draft");
    const safeSourceFormData = normalizeResidentialEventSingleDay(sourceFormData);
    const draftData = {
      owner_user_id: user.id,
      listing_type: listingType,
      title,
      tier: safeSourceFormData.event_tier || safeSourceFormData.tier || "",
      last_step: draftStep,
      data_json: JSON.stringify(safeSourceFormData),
      status: "active",
      saved_reason: "in_progress",
    };

    if (activeDraftId) {
      await base44.entities.ListingDraft.update(activeDraftId, draftData);
      return activeDraftId;
    }

    const createdDraft = await base44.entities.ListingDraft.create(draftData);
    setActiveDraftId(createdDraft.id);
    return createdDraft.id;
  };

  useEffect(() => {
    if (!user?.id || isAdminCreate || !hasListingDraftContent(formData)) return;

    const timeoutId = window.setTimeout(() => {
      saveBackedOutDraft(formData, step).catch(() => {});
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [formData, step, user?.id, isAdminCreate]);

  const confirmSelectedHomeAddress = async () => {
    const selected = pendingHomeAddress || formData;
    if (!selected?.selected_geocode_confirmed || typeof selected?.lat !== "number" || typeof selected?.lng !== "number") {
      toast.error("Please select an address from the suggested matches before continuing.");
      setShowHomeAddressConfirm(false);
      return;
    }
    setIsConfirmingHomeAddress(true);
    try {
      const now = new Date().toISOString();
      const stateCode = getStateAbbreviation(selected.state || "");
      const fullAddress = getHomeAddressLabel(selected);
      await base44.auth.updateMe({
        has_primary_address: true, primary_address_verified: true, address_verified: true, primary_address: fullAddress,
        primary_latitude: selected.lat, primary_longitude: selected.lng, primary_address_verified_at: now,
        primary_address_last_changed_at: user?.primary_address_last_changed_at || now, address_verification_required: false,
        street_address: selected.addressText, city: selected.city, state: stateCode, zip_code: selected.zip,
        address_lat: selected.lat, address_lng: selected.lng, address_confirmation_status: "confirmed", address: fullAddress,
        ...(selected.timeZoneId ? { timeZoneId: selected.timeZoneId } : {}),
      });
      const refreshedUser = normalizeUser(await base44.auth.me());
      setUser(refreshedUser);
      setFormData(buildResolvedListingLocation({ ...selected, addressText: fullAddress, state: stateCode, locationMethod: "verified_primary_address" }));
      markResidentialConflictInteraction();
      setShowHomeAddressConfirm(false);
      setPendingHomeAddress(null);
      toast.success("Home address confirmed. You can now continue creating your listing.");
      setStep(3);
    } catch (error) {
      toast.error(error?.message || "We couldn't update your profile address. Please try again.");
    } finally {
      setIsConfirmingHomeAddress(false);
    }
  };

  const buildNonRefundFields = (nonRefundAcknowledgement = {}) => ({
    non_refund_acknowledged: nonRefundAcknowledgement.acknowledged === true,
    non_refund_acknowledged_at: nonRefundAcknowledgement.acknowledged_at || "",
    non_refund_acknowledged_by_user_id: user?.id || "",
    non_refund_disclosure_text: nonRefundAcknowledgement.disclosure_text || "",
  });

  const buildPromoEarlyVisibilityFields = (promoResult = null, sourceData = formData) => {
    const earlyVisibility = promoResult?.earlyVisibility;
    if (!earlyVisibility?.enabled || !earlyVisibility.visibility_start_date) {
      return {
        early_visibility_enabled: false,
        early_visibility_days: 0,
        visibility_start_date: "",
        early_visibility_promo_code: "",
      };
    }

    const listingStartDate = sourceData.selectedRangeStartDate || sourceData.startDateTime?.slice?.(0, 10) || "";
    const safeVisibilityStartDate = listingStartDate && earlyVisibility.visibility_start_date > listingStartDate
      ? listingStartDate
      : earlyVisibility.visibility_start_date;

    return {
      early_visibility_enabled: true,
      early_visibility_days: Number(earlyVisibility.days || 0),
      visibility_start_date: safeVisibilityStartDate,
      early_visibility_promo_code: earlyVisibility.promo_code || promoResult?.promoCode?.code || "",
    };
  };

  const startPaidListingCheckout = async (promoResult = null, nonRefundAcknowledgement = {}, skipDemoPrompt = false) => {
    const descriptionLimitError = getResidentialDescriptionLimitError(formData);
    if (descriptionLimitError) {
      setPaymentError(descriptionLimitError);
      toast.error(descriptionLimitError);
      return;
    }

    if (isAdminDemoMode && !skipDemoPrompt) {
      setDemoPaymentRequest({ type: "paid_listing", promoResult, nonRefundAcknowledgement });
      return;
    }

    if (window.self !== window.top) {
      console.warn("Stripe checkout blocked inside iframe preview");
      setPaymentError("Stripe checkout must be tested from the published app, not the Base44 preview.");
      toast.error("Stripe checkout must be tested from the published app, not the Base44 preview.");
      return;
    }

    if (formData.listingType === "yard_sale" && formData.selectedRangeStartDate && formData.selectedRangeEndDate) {
      const conflict = await checkDateConflictLive(formData.selectedRangeStartDate, formData.selectedRangeEndDate, formData.listingType, formData);
      if (conflict) {
        setPaymentError("There’s already a yard sale planned at this address for those dates.");
        return;
      }
    }

    const eventPriceBreakdown = formData.listingType === "event" ? getResidentialEventPriceBreakdown(formData) : null;
    const amountCents = formData.listingType === "event"
      ? eventPriceBreakdown.total
      : RESIDENTIAL_TIER_PRICES[formData.tier];
    if (!amountCents) {
      toast.error("Unsupported paid tier.");
      return;
    }

    try {
      setPaymentError("");
      setIsStartingPayment(true);
      const nonRefundFields = buildNonRefundFields(nonRefundAcknowledgement);
      const earlyVisibilityFields = buildPromoEarlyVisibilityFields(promoResult);
      const checkoutFormData = normalizeResidentialEventSingleDay({ ...formData, ...nonRefundFields, ...earlyVisibilityFields });
      setFormData(checkoutFormData);
      localStorage.setItem(PAID_LISTING_CHECKOUT_KEY, JSON.stringify({ formData: checkoutFormData }));

      const returnUrl = `${window.location.origin}${createPageUrl("CreateListing")}`;
      const promoPayload = promoResult ? {
        promo_code_id: promoResult.promoCode?.id,
        promo_code: promoResult.promoCode?.code,
        promo_discount_percent: promoResult.discountPercent,
        promo_discount_amount: promoResult.discountAmount,
        promo_discount_bucket: promoResult.discountBucket,
        promo_final_amount: promoResult.finalAmount,
        user_id: user?.id,
        promo_early_visibility_enabled: promoResult.earlyVisibility?.enabled === true,
        promo_early_visibility_days: promoResult.earlyVisibility?.days || 0,
        promo_visibility_start_date: promoResult.earlyVisibility?.visibility_start_date || "",
      } : {};
      const response = await base44.functions.invoke("residentialStripeCheckout", {
        tier: checkoutFormData.listingType === "event" ? "event" : checkoutFormData.tier,
        listing_kind: checkoutFormData.listingType === "event" ? "event" : "residential",
        amount_cents: amountCents,
        event_price_breakdown: eventPriceBreakdown,
        customer_email: user?.email,
        return_url: returnUrl,
        listing_id: "",
        owner_user_id: user?.id,
        listingType: checkoutFormData.listingType,
        description: checkoutFormData.description || checkoutFormData.event_description || "",
        event_description: checkoutFormData.event_description || "",
        addressText: checkoutFormData.addressText || user?.primary_address || user?.street_address || "",
        zip: checkoutFormData.zip || user?.zip_code || "",
        lat: checkoutFormData.lat ?? user?.primary_latitude ?? user?.address_lat,
        lng: checkoutFormData.lng ?? user?.primary_longitude ?? user?.address_lng,
        selectedRangeStartDate: checkoutFormData.selectedRangeStartDate,
        selectedRangeEndDate: checkoutFormData.selectedRangeEndDate,
        event_start_date: checkoutFormData.event_start_date,
        event_end_date: checkoutFormData.event_end_date,
        event_start_time: checkoutFormData.event_start_time,
        event_end_time: checkoutFormData.event_end_time,
        start_datetime: checkoutFormData.start_datetime,
        end_datetime: checkoutFormData.end_datetime,
        startDateTime: checkoutFormData.startDateTime,
        endDateTime: checkoutFormData.endDateTime,
        non_refund_acknowledged: nonRefundFields.non_refund_acknowledged,
        non_refund_acknowledged_at: nonRefundFields.non_refund_acknowledged_at,
        non_refund_acknowledged_by_user_id: nonRefundFields.non_refund_acknowledged_by_user_id,
        non_refund_disclosure_text: nonRefundFields.non_refund_disclosure_text,
        ...promoPayload,
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

  const startNeighborhoodSaleSetup = async (nonRefundAcknowledgement = {}, sourceFormData = formData, skipDemoPrompt = false) => {
    const descriptionLimitError = getResidentialDescriptionLimitError(formData);
    if (descriptionLimitError) {
      setPaymentError(descriptionLimitError);
      toast.error(descriptionLimitError);
      return;
    }

    if (isAdminDemoMode && !skipDemoPrompt) {
      setDemoPaymentRequest({ type: "neighborhood_setup", nonRefundAcknowledgement, sourceFormData });
      return;
    }

    if (window.self !== window.top) {
      console.warn("Stripe setup blocked inside iframe preview");
      setPaymentError("Stripe setup must be tested from the published app, not the Base44 preview.");
      toast.error("Stripe setup must be tested from the published app, not the Base44 preview.");
      return;
    }

    try {
      setPaymentError("");
      setIsStartingPayment(true);
      const nonRefundFields = buildNonRefundFields(nonRefundAcknowledgement);
      localStorage.setItem(NEIGHBORHOOD_SETUP_KEY, JSON.stringify({ formData: { ...sourceFormData, ...nonRefundFields } }));

      const returnUrl = `${window.location.origin}${createPageUrl("CreateListing")}`;
      const response = await base44.functions.invoke("neighborhoodSaleSetupCheckout", {
        return_url: returnUrl,
        customer_id: sourceFormData.organizer_stripe_customer_id || undefined,
        non_refund_acknowledged: nonRefundFields.non_refund_acknowledged,
        non_refund_acknowledged_at: nonRefundFields.non_refund_acknowledged_at,
        non_refund_acknowledged_by_user_id: nonRefundFields.non_refund_acknowledged_by_user_id,
        non_refund_disclosure_text: nonRefundFields.non_refund_disclosure_text,
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
      if (!isAdminCreate && data.listingType === "yard_sale" && data.selectedRangeStartDate && data.selectedRangeEndDate) {
        const conflict = await checkDateConflictLive(data.selectedRangeStartDate, data.selectedRangeEndDate, data.listingType, data);
        if (conflict) {
          throw new Error("There’s already a yard sale planned at this address for those dates.");
        }
      }

      // Generate listing number: STATE + last4zip + dash + 5 random chars
      const stateCode = getStateAbbreviation(data.state || "XX");
      const zipLast4 = (data.zip || "0000").slice(-4).padStart(4, "0");
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let rand5 = "";
      for (let i = 0; i < 5; i++) rand5 += chars[Math.floor(Math.random() * chars.length)];
      const listingNumber = `${stateCode}${zipLast4}-${rand5}`;

      const response = await base44.functions.invoke("saveResidentialListing", {
        action: "create",
        data: {
          ...data,
          title: data.title,
          ownerUserId: isAdminCreate ? selectedUserForAdmin?.id : user.id,
          status: data.status || (data.listingType === "neighborhood_sale" ? "collecting_participants" : "active"),
          event_state: data.listingType === "neighborhood_sale" ? (data.event_state || "pending_activation") : data.event_state,
          listingNumber,
          ...(isAdminCreate ? { created_by_admin: true, created_by_admin_id: user.id } : {})
        }
      });
      const listing = response.data.listing;

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
      if (activeDraftId) {
        try {
          await base44.entities.ListingDraft.delete(activeDraftId);
          setActiveDraftId(null);
        } catch (err) {
          console.error("Failed to remove completed draft", err);
        }
      }

      if (createdListing.listingType === "neighborhood_sale") {
        try {
          if (!isAdminCreate && createdListing.organizer_participation !== "organizing_only") {
            if (createdListing.fallback_action === "premium_host_listing" && createdListing.fallback_listing_id) {
              await base44.entities.Listing.update(createdListing.fallback_listing_id, {
                neighborhood_join_status: "approved",
                payment_intent_status: "none",
                neighborhood_sale_id: createdListing.id,
                participant_origin: "standalone",
              });
              await base44.entities.Listing.update(createdListing.id, {
                organizer_participant_listing_id: createdListing.fallback_listing_id,
                homeCount: 1,
              });
            } else {
              const organizerState = getStateAbbreviation(user.state || user.primary_state || createdListing.state || "XX");
              const organizerZip = user.zip_code || createdListing.zip || "0000";
              const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
              let participantSuffix = "";
              for (let i = 0; i < 5; i++) participantSuffix += chars[Math.floor(Math.random() * chars.length)];
              const organizerParticipant = await base44.entities.Listing.create({
                ownerUserId: createdListing.ownerUserId,
                listingType: "yard_sale",
                title: `${createdListing.title || "Neighborhood Sale"} - Organizer Sale`,
                description: "",
                addressText: user.primary_address || user.street_address || createdListing.addressText,
                city: user.city || createdListing.city,
                state: organizerState,
                zip: organizerZip,
                lat: user.primary_latitude ?? user.address_lat ?? createdListing.lat,
                lng: user.primary_longitude ?? user.address_lng ?? createdListing.lng,
                timeZoneId: user.timeZoneId || createdListing.timeZoneId || "",
                tier: "free",
                pricePaid: 0,
                status: "active",
                category: "Neighborhood Sale",
                categories: [],
                startDateTime: createdListing.startDateTime,
                endDateTime: createdListing.endDateTime,
                selectedRangeStartDate: createdListing.selectedRangeStartDate || createdListing.startDateTime?.slice(0, 10),
                selectedRangeEndDate: createdListing.selectedRangeEndDate || createdListing.endDateTime?.slice(0, 10),
                neighborhood_join_status: "approved",
                payment_intent_status: "none",
                neighborhood_sale_id: createdListing.id,
                participant_origin: "neighborhood_invite",
                origin_sale_listing_id: createdListing.id,
                listingNumber: `${organizerState}${String(organizerZip).slice(-4).padStart(4, "0")}-${participantSuffix}`,
              });

              await base44.entities.Listing.update(createdListing.id, {
                organizer_participant_listing_id: organizerParticipant.id,
                homeCount: 1,
              });
            }
          }

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
            message: "A Neighborhood Sale was created near your listing. Tap here to request that your Yard Sale be included with the Neighborhood Sale. You will not be charged a separate listing payment to participate.",
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

      if (createdListing.pending_checkout_session_id && ["yard_sale", "event"].includes(createdListing.listingType)) {
        await base44.functions.invoke("residentialStripeCheckout", {
          action: "link_paid_listing",
          session_id: createdListing.pending_checkout_session_id,
          listing_id: createdListing.id,
        });
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
      clearStaleTrustProgress();
      toast.success("Listing created successfully!");
      navigate(createPageUrl("MyListings"));
    },
    onError: (error) => {
      setIsStartingPayment(false);
      if (error?.response?.data?.conflict) {
        setResidentialConflict({ has_conflict: true, ...error.response.data.conflict, message: error.response.data.error });
      }
      toast.error(error?.response?.data?.error || error.message || "Failed to create listing");
    }
  });

  const handleNext = async () => {
    if (formData.listingType === "yard_sale") {
      setHasAttemptedContinue(true);
    }

    if (step === 1) {
      const descriptionLimitError = getResidentialDescriptionLimitError(formData);
      if (descriptionLimitError) {
        toast.error(descriptionLimitError);
        return;
      }

      if (formData.listingType === "event") {
        if (!formData.event_name || !formData.event_category) {
          toast.error("Please fill in all required event fields");
          return;
        }
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (formData.listingType === "neighborhood_sale") {
        if (localStorage.getItem(NEIGHBORHOOD_INTRO_HIDE_KEY) === "true") {
          setStep(2);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setShowNeighborhoodIntro(true);
        }
        return;
      }
      if (!formData.title) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (formData.listingType !== "neighborhood_sale") {
        if (!formData.category && (!formData.categories || formData.categories.length === 0)) {
          toast.error("Please fill in all required fields");
          return;
        }
        if ((formData.category === "Collectibles" || formData.categories?.includes("Collectibles")) && !formData.collectible_type) {
          toast.error("Please select a collectible type");
          return;
        }
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (formData.listingType === "neighborhood_sale") {
        if (!formData.title?.trim()) {
          toast.error("Please enter an event title");
          return;
        }

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
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (!isAdminDemoMode && !isAdminCreate) {
        if (profileIncomplete) {
          toast.error("Complete your profile to start posting.");
          navigate(createPageUrl("Profile"));
          return;
        }

        if (!userHasVerifiedPrimaryAddress) {
          if (!geocodeRef || typeof geocodeRef !== "function") {
            toast.error("Please select an address from the suggested matches before continuing.");
            return;
          }
          if (!formData.selected_geocode_confirmed || typeof formData.lat !== "number" || typeof formData.lng !== "number") {
            await geocodeRef();
            toast.error("Please select your address from the suggested matches below.");
            return;
          }
          const normalizedSelected = buildResolvedListingLocation(formData);
          setPendingHomeAddress(normalizedSelected);
          setShowHomeAddressConfirm(true);
          return;
        }

        let resolvedProfileTimeZoneId = user?.timeZoneId || formData.timeZoneId || "";
        const profileLat = user.primary_latitude ?? user.address_lat;
        const profileLng = user.primary_longitude ?? user.address_lng;
        if (!resolvedProfileTimeZoneId && typeof profileLat === "number" && typeof profileLng === "number") {
          resolvedProfileTimeZoneId = resolveTimeZoneFromCoordinates(profileLat, profileLng) || "";
          if (resolvedProfileTimeZoneId) {
            await base44.auth.updateMe({ timeZoneId: resolvedProfileTimeZoneId });
            const refreshedUser = await base44.auth.me();
            setUser(refreshedUser);
          }
        }

        const nextData = buildResolvedListingLocation({
          ...formData,
          addressText: user.primary_address,
          city: user.city,
          state: (user.state || "").toUpperCase().slice(0, 2),
          zip: user.zip_code,
          lat: profileLat,
          lng: profileLng,
          timeZoneId: resolvedProfileTimeZoneId,
          locationMethod: "verified_primary_address"
        });
        setFormData(nextData);

        // Neighborhood Sale discovery appears on tier selection.
        setStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
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

      // Neighborhood Sale discovery appears on tier selection.
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 3 && formData.listingType === "yard_sale") {
      if (formData.tier === "featured" || formData.tier === "premium") {
        if (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate) {
          toast.error("Please select your event dates");
          return;
        }
        if (hasResidentialDateConflict(formData.selectedRangeStartDate, formData.selectedRangeEndDate)) {
          toast.error("These dates are already reserved for this address. Please choose different dates.");
          return;
        }
      }
      if (!formData.openTime || !formData.closeTime) {
        toast.error("Please set your open and close hours");
        return;
      }
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 3 && formData.listingType === "event") {
      const safeEventData = normalizeResidentialEventSingleDay(formData);
      setFormData(safeEventData);
      const scheduleValidation = getEventScheduleValidation(safeEventData);
      if (!scheduleValidation.hasRequiredFields) {
        toast.error("Please complete the event start/end dates and times");
        return;
      }
      if (scheduleValidation.errors.length > 0) {
        toast.error(scheduleValidation.errors[0]);
        return;
      }
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

  };

  const executeSubmit = (actionStr, sourceFormData = formData) => {
    const descriptionLimitError = getResidentialDescriptionLimitError(sourceFormData);
    if (descriptionLimitError) {
      toast.error(descriptionLimitError);
      return;
    }

    let payload = normalizeResidentialEventSingleDay({ ...sourceFormData, timeZoneId: sourceFormData.timeZoneId || "" });

    if (isAdminCreate) {
      payload.location_source = "admin_selected";
    }

    if (payload.listingType === "event") {
      payload = {
        ...payload,
        title: payload.event_name,
        description: payload.event_description || "",
        category: payload.event_category,
        tier: "event",
        event_tier: "event",
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
        pricePaid: Number(getResidentialEventPriceBreakdown(payload).total || 0) / 100,
      };
    }

    if (payload.listingType === "yard_sale" && !isAdminDemoMode && !isAdminCreate) {
      const profileLat = user.primary_latitude ?? user.address_lat;
      const profileLng = user.primary_longitude ?? user.address_lng;
      if (!userHasVerifiedPrimaryAddress || typeof profileLat !== "number" || typeof profileLng !== "number") {
        throw new Error("Please confirm your home address before publishing.");
      }
      const selectedDistanceFeet = getDistanceFeet(payload.lat, payload.lng, profileLat, profileLng);
      if (selectedDistanceFeet > 500) {
        throw new Error("Your listing must use your verified primary address. You can adjust the pin slightly for map accuracy.");
      }

      payload = {
        ...payload,
        addressText: user.primary_address,
        city: user.city,
        state: getStateAbbreviation(user.state || ""),
        zip: user.zip_code,
        lat: typeof payload.lat === "number" ? payload.lat : profileLat,
        lng: typeof payload.lng === "number" ? payload.lng : profileLng,
        timeZoneId: user?.timeZoneId || payload.timeZoneId || "",
        locationMethod: "verified_primary_address",
      };
    }

    if (payload.listingType === "neighborhood_sale") {
      const listingTimeZone = payload.timeZoneId || sourceFormData.timeZoneId || "America/Los_Angeles";
      const startDateTime = zonedDateTimeToUtcDate(sourceFormData.selectedRangeStartDate, "05:00:00", listingTimeZone).toISOString();
      const endDateTime = zonedDateTimeToUtcDate(sourceFormData.selectedRangeEndDate, "22:00:00", listingTimeZone).toISOString();
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
      payload.organizer_participation = sourceFormData.organizer_participation || "participating";
      payload.fallback_action = sourceFormData.fallback_action || "cancel";
      payload.fallback_listing_id = sourceFormData.fallback_listing_id || "";
      payload.fallback_consent_at = sourceFormData.fallback_consent_at || "";
      payload.homeCount = payload.organizer_participation === "organizing_only" ? 0 : 1;
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

    if (payload.listingType === "yard_sale" && payload.tier === "free") {
      const freeWindow = computeFreeWindow(new Date(), payload.timeZoneId);
      payload = {
        ...payload,
        startDateTime: freeWindow.effectiveStart.toISOString(),
        endDateTime: freeWindow.effectiveEnd.toISOString(),
        selectedRangeStartDate: freeWindow.startYMD,
        selectedRangeEndDate: freeWindow.endYMD,
        status: freeWindow.isCurrentlyWeekend ? "active" : "scheduled",
        activation_status: freeWindow.isCurrentlyWeekend ? "active" : "pending",
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: freeWindow.activeDates,
        early_visibility_enabled: false,
        early_visibility_days: 0,
        visibility_start_date: "",
        early_visibility_promo_code: ""
      };
    }

    if (sourceFormData.tier === "featured" && payload.listingType !== "event") {
      const startLocal = new Date(`${sourceFormData.selectedRangeStartDate}T00:00:00`);
      const endLocal = new Date(`${sourceFormData.selectedRangeEndDate}T00:00:00`);
      const diffDays = Math.round((endLocal - startLocal) / (1000 * 60 * 60 * 24)) + 1;
      let activeDates = [];
      const pad = (n) => String(n).padStart(2, "0");
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(startLocal);
        d.setDate(d.getDate() + i);
        activeDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }

      payload = {
        ...payload,
        startDateTime: zonedDateTimeToUtcDate(sourceFormData.selectedRangeStartDate, "05:00:00", payload.timeZoneId || "America/Los_Angeles").toISOString(),
        endDateTime: zonedDateTimeToUtcDate(sourceFormData.selectedRangeEndDate, "22:00:00", payload.timeZoneId || "America/Los_Angeles").toISOString(),
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
        startDateTime: zonedDateTimeToUtcDate(sourceFormData.selectedRangeStartDate, "05:00:00", payload.timeZoneId || "America/Los_Angeles").toISOString(),
        endDateTime: zonedDateTimeToUtcDate(sourceFormData.selectedRangeEndDate, "22:00:00", payload.timeZoneId || "America/Los_Angeles").toISOString(),
        earlyVisibilityDays: earlyDays,
        earlyVisibilityDates,
        activeDates,
        ...(earlyVisibilityStartDateTime && { earlyVisibilityStartDateTime })
      };
    }

    if (payload.listingType !== "neighborhood_sale") {
      payload.participant_origin = payload.participant_origin || "standalone";
    }

    payload.neighborhood_join_status = payload.neighborhood_join_status || "none";

    if (actionStr === "paid_success" && payload.listingType === "event") {
      payload.status = "active";
      payload.pricePaid = Number(getResidentialEventPriceBreakdown(payload).total || 0) / 100;
    }

    if (actionStr === "paid_success_pending_link" && payload.listingType === "event") {
      payload.status = "active";
      payload.payment_status = "pending";
      payload.pending_checkout_session_id = sourceFormData.pending_checkout_session_id || "";
      payload.payment_intent_status = sourceFormData.payment_intent_status || "hold_requested";
    }

    if (actionStr === "paid_success_pending_link" && ["featured", "premium"].includes(payload.tier) && payload.listingType !== "event") {
      payload.status = "pending_payment";
      payload.payment_status = "pending";
      payload.pricePaid = 0;
      payload.pending_checkout_session_id = sourceFormData.pending_checkout_session_id || "";
      payload.payment_intent_status = sourceFormData.payment_intent_status || "hold_requested";
    }

    if (actionStr === "demo_skip_payment") {
      payload.is_demo_listing = true;
      payload.payment_status = "skipped_admin_demo";
      payload.payment_intent_status = "captured";
      payload.pricePaid = Number(sourceFormData.demo_skip_amount_cents || 0) / 100;
      payload.stripe_checkout_session_id = sourceFormData.demo_skip_session_id || `demo_skip_${Date.now()}`;
      payload.status = payload.listingType === "event" ? "active" : "scheduled";
    }

    createListingMutation.mutate(payload);
  };

  const handleDemoPaymentSkip = () => {
    if (!demoPaymentRequest) return;

    if (demoPaymentRequest.type === "paid_listing") {
      const eventPriceBreakdown = formData.listingType === "event" ? getResidentialEventPriceBreakdown(formData) : null;
      const amountCents = formData.listingType === "event"
        ? eventPriceBreakdown.total
        : RESIDENTIAL_TIER_PRICES[formData.tier];
      const nonRefundFields = buildNonRefundFields(demoPaymentRequest.nonRefundAcknowledgement);
      const earlyVisibilityFields = buildPromoEarlyVisibilityFields(demoPaymentRequest.promoResult);
      const demoFormData = normalizeResidentialEventSingleDay({
        ...formData,
        ...nonRefundFields,
        ...earlyVisibilityFields,
        is_demo_listing: true,
        demo_skip_amount_cents: amountCents || 0,
        demo_skip_session_id: `demo_skip_${Date.now()}`,
      });
      setDemoPaymentRequest(null);
      setFormData(demoFormData);
      setPaymentError("");
      setIsStartingPayment(true);
      executeSubmit("demo_skip_payment", demoFormData);
      return;
    }

    if (demoPaymentRequest.type === "neighborhood_setup") {
      const nonRefundFields = buildNonRefundFields(demoPaymentRequest.nonRefundAcknowledgement);
      const demoFormData = {
        ...demoPaymentRequest.sourceFormData,
        ...nonRefundFields,
        is_demo_listing: true,
        payment_setup_status: "demo_skipped",
        organizer_stripe_customer_id: "demo_customer",
        organizer_stripe_payment_method_id: "demo_card",
        organizer_setup_session_id: `demo_setup_${Date.now()}`,
        organizer_setup_intent_id: `demo_setup_intent_${Date.now()}`,
        payment_method_collected_at: new Date().toISOString(),
      };
      setDemoPaymentRequest(null);
      setFormData(demoFormData);
      setPaymentError("");
      setIsStartingPayment(true);
      executeSubmit(undefined, demoFormData);
    }
  };

  const handleDemoPaymentContinue = () => {
    const request = demoPaymentRequest;
    setDemoPaymentRequest(null);
    if (!request) return;
    if (request.type === "paid_listing") {
      startPaidListingCheckout(request.promoResult, request.nonRefundAcknowledgement, true);
    }
    if (request.type === "neighborhood_setup") {
      startNeighborhoodSaleSetup(request.nonRefundAcknowledgement, request.sourceFormData, true);
    }
  };

  const handlePaymentStepSubmit = async ({ promoResult, finalAmount, nonRefundAcknowledgement } = {}) => {
    if (promoResult && promoResult.finalAmount === 0) {
      if (window.self !== window.top) {
        setPaymentError("Checkout must be tested from the published app.");
        return;
      }
      try {
        setPaymentError("");
        setIsStartingPayment(true);

        const nonRefundFields = buildNonRefundFields(nonRefundAcknowledgement);
        const earlyVisibilityFields = buildPromoEarlyVisibilityFields(promoResult);
        const listingPayload = { ...buildFreePromoListingPayload({ ...formData, ...earlyVisibilityFields }), ...nonRefundFields };
        const createdListing = await createListingDirectlyWithPromo(listingPayload);

        await base44.functions.invoke("residentialStripeCheckout", {
          action: "complete_free_promo",
          listing_id: createdListing.id,
          promo_code_id: promoResult.promoCode.id,
          promo_code: promoResult.promoCode.code,
          discount_percent: promoResult.discountPercent,
          discount_amount: promoResult.discountAmount,
          original_amount: RESIDENTIAL_TIER_PRICES[formData.tier] || 0,
          discount_bucket: promoResult.discountBucket,
          user_id: user?.id,
          user_email: user?.email,
          non_refund_acknowledged: nonRefundFields.non_refund_acknowledged,
          non_refund_acknowledged_at: nonRefundFields.non_refund_acknowledged_at,
          non_refund_acknowledged_by_user_id: nonRefundFields.non_refund_acknowledged_by_user_id,
          non_refund_disclosure_text: nonRefundFields.non_refund_disclosure_text,
        });

        if (activeDraftId) {
          await base44.entities.ListingDraft.delete(activeDraftId);
          setActiveDraftId(null);
        }

        setIsStartingPayment(false);
        toast.success("🎉 Free promo applied! Your listing is live.");
        queryClient.invalidateQueries({ queryKey: ["listings"] });
        queryClient.invalidateQueries({ queryKey: ["userListings", user?.id] });
        navigate(createPageUrl("MyListings"));
      } catch (err) {
        setIsStartingPayment(false);
        setPaymentError(err?.message || "Could not complete free promo. Please try again.");
        toast.error(err?.message || "Could not complete free promo.");
      }
      return;
    }

    await startPaidListingCheckout(promoResult, nonRefundAcknowledgement);
  };

  const buildFreePromoListingPayload = (data) => {
    const stateCode = getStateAbbreviation(data.state || "XX");
    const zipLast4 = (data.zip || "0000").slice(-4).padStart(4, "0");
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let rand5 = "";
    for (let i = 0; i < 5; i++) rand5 += chars[Math.floor(Math.random() * chars.length)];
    const listingNumber = `${stateCode}${zipLast4}-${rand5}`;

    let payload = { ...data, listingNumber, ownerUserId: user.id, participant_origin: "standalone", neighborhood_join_status: "none" };
    if (["featured", "premium"].includes(data.tier)) {
      const startLocal = new Date(`${data.selectedRangeStartDate}T00:00:00`);
      const endLocal = new Date(`${data.selectedRangeEndDate}T00:00:00`);
      const diffDays = Math.round((endLocal - startLocal) / (1000 * 60 * 60 * 24)) + 1;
      const activeDates = [];
      const pad = (n) => String(n).padStart(2, "0");
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(startLocal); d.setDate(d.getDate() + i);
        activeDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
      payload.startDateTime = zonedDateTimeToUtcDate(data.selectedRangeStartDate, "05:00:00", data.timeZoneId || "America/Los_Angeles").toISOString();
      payload.endDateTime = zonedDateTimeToUtcDate(data.selectedRangeEndDate, "22:00:00", data.timeZoneId || "America/Los_Angeles").toISOString();
      payload.activeDates = activeDates;
      payload.earlyVisibilityDates = data.tier === "premium" ? (data.earlyVisibilityDates || []) : [];
      payload.earlyVisibilityDays = data.tier === "premium" ? Math.max(0, Math.min(3, Number(data.earlyVisibilityDays || 0))) : 0;
    }
    payload.status = "pending_payment";
    payload.payment_status = "pending";
    payload.pricePaid = 0;
    payload.payment_intent_status = "none";
    return payload;
  };

  const createListingDirectlyWithPromo = async (payload) => {
    const response = await base44.functions.invoke("saveResidentialListing", {
      action: "create",
      data: payload,
    });
    return response.data.listing;
  };

  const handleNeighborhoodSetupSubmit = async (nonRefundAcknowledgement = {}) => {
    const fallbackAction = nonRefundAcknowledgement.fallback_action || formData.fallback_action;
    const fallbackListingId = nonRefundAcknowledgement.fallback_listing_id || formData.fallback_listing_id || "";

    if (!fallbackAction) {
      setPaymentError("Choose what should happen if the Neighborhood Sale does not reach 5 homes.");
      return;
    }

    if (fallbackAction === "premium_host_listing" && !fallbackListingId) {
      setPaymentError("The Premium fallback needs your own eligible Yard Sale listing. Select an existing listing or create one before continuing.");
      return;
    }

    const nonRefundFields = buildNonRefundFields(nonRefundAcknowledgement);
    const fallbackFields = {
      fallback_action: fallbackAction,
      fallback_listing_id: fallbackListingId,
      fallback_consent_at: nonRefundAcknowledgement.fallback_consent_at || new Date().toISOString(),
    };
    const setupFormData = { ...formData, ...nonRefundFields, ...fallbackFields };
    setFormData(setupFormData);

    if (!setupFormData.organizer_stripe_payment_method_id || !setupFormData.organizer_stripe_customer_id) {
      await startNeighborhoodSaleSetup(nonRefundAcknowledgement, setupFormData);
      return;
    }
    executeSubmit(undefined, setupFormData);
  };

  const handleSubmit = async ({ userInitiated = false } = {}) => {
    const descriptionLimitError = getResidentialDescriptionLimitError(formData);
    if (descriptionLimitError) {
      toast.error(descriptionLimitError);
      return;
    }

    const canShowResidentialConflictToast = userInitiated || hasUserInteractedWithDates || hasAttemptedContinue;
    if (userInitiated) setHasAttemptedContinue(true);

    if (!isAdminCreate && !isAdminDemoMode && formData.listingType === "yard_sale" &&
        (!userHasVerifiedPrimaryAddress || typeof (user?.primary_latitude ?? user?.address_lat) !== "number" || typeof (user?.primary_longitude ?? user?.address_lng) !== "number")) {
      toast.error("Please confirm your home address before publishing.");
      setStep(2);
      return;
    }

    if (["yard_sale", "neighborhood_sale"].includes(formData.listingType) && hasPastSelectedDates(formData)) {
      setStep(3);
      toast.error("The selected dates have already passed. Please choose new dates before continuing.");
      return;
    }

    if (!isAdminCreate && formData.listingType === "yard_sale" &&
        formData.selectedRangeStartDate && formData.selectedRangeEndDate) {
      const conflict = await checkDateConflictLive(formData.selectedRangeStartDate, formData.selectedRangeEndDate, formData.listingType, formData);
      if (conflict) {
        if (canShowResidentialConflictToast) {
          toast.error("There’s already a yard sale planned at this address for those dates.");
        }
        return;
      }
    }

    if (formData.listingType === "event") {
      const safeEventData = normalizeResidentialEventSingleDay(formData);
      setFormData(safeEventData);
      const scheduleValidation = getEventScheduleValidation(safeEventData);
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
      if (!["participating", "organizing_only"].includes(formData.organizer_participation)) {
        toast.error("Please choose whether you are participating or only organizing.");
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

    if (formData.listingType === "yard_sale") {
      const openHoursError = getOpenHoursError(formData);
      if (openHoursError) {
        toast.error(openHoursError);
        return;
      }
    }

    if ((formData.tier === "featured" || formData.tier === "premium") && (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate)) {
      toast.error("Please select start and end dates");
      return;
    }
    if (formData.tier === "featured") {
      const startLocal = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
      const endLocal = new Date(`${formData.selectedRangeEndDate}T00:00:00`);
      const diff = Math.round((endLocal - startLocal) / (1000 * 60 * 60 * 24)) + 1;
      if (diff < 1 || diff > 3) {
        toast.error("Featured allows 1 to 3 consecutive days");
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
    if (!user?.id || recoveringPaidCheckoutRef.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get("payment") || params.get("neighborhoodSetup")) return;

    const raw = localStorage.getItem(PAID_LISTING_CHECKOUT_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw);
      if (!stored?.formData) return;

      recoveringPaidCheckoutRef.current = true;
      base44.functions.invoke("residentialStripeCheckout", { action: "recover_paid_checkout" }).then(async (response) => {
        if (response?.data?.stripe_paid && response?.data?.session_id) {
          if (stored.formData?.listingType === "yard_sale" && stored.formData?.selectedRangeStartDate) {
            const conflict = await checkDateConflictLive(stored.formData.selectedRangeStartDate, stored.formData.selectedRangeEndDate);
            if (conflict) {
              recoveringPaidCheckoutRef.current = false;
              setPaymentError("These dates are already reserved for this address. Please choose different dates or edit your existing listing.");
              toast.error("These dates are already reserved for this address.");
              return;
            }
          }
          toast.success("Payment found — creating your listing now.");
          executeSubmit("paid_success_pending_link", normalizeResidentialEventSingleDay({
            ...stored.formData,
            pending_checkout_session_id: response.data.session_id,
            payment_intent_status: "hold_requested",
          }));
        } else {
          recoveringPaidCheckoutRef.current = false;
        }
      }).catch(() => {
        recoveringPaidCheckoutRef.current = false;
      });
    } catch {
      recoveringPaidCheckoutRef.current = false;
    }
  }, [location.search, user?.id]);

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
        saveBackedOutDraft(stored.formData, 4).finally(() => {
          localStorage.removeItem(NEIGHBORHOOD_SETUP_KEY);
          setIsStartingPayment(false);
          setPaymentError("Payment method setup was canceled. Your draft was saved.");
          toast.error("Payment method setup was canceled. Your draft was saved in My Listings.");
          navigate(createPageUrl("MyListings") + "?tab=drafts");
        });
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
        const restoredFormData = normalizeResidentialEventSingleDay(stored.formData);
        setFormData(restoredFormData);
        setStep(restoredFormData?.listingType === "event" ? 5 : 4);
      }

      window.history.replaceState({}, "", createPageUrl("CreateListing"));

      if (paymentState === "cancel") {
        console.log("Return from Stripe cancel");
        const draftStep = stored.formData?.listingType === "event" ? 5 : 4;
        saveBackedOutDraft(stored.formData, draftStep).finally(() => {
          localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);
          setIsStartingPayment(false);
          setPaymentError("Payment was canceled. Your draft was saved.");
          toast.error("Payment was canceled. Your draft was saved in My Listings.");
          navigate(createPageUrl("MyListings") + "?tab=drafts");
        });
        return;
      }

      if (paymentState === "success" && sessionId && handledCheckoutSessionRef.current !== sessionId && stored?.formData) {
        console.log("Return from Stripe success", sessionId);
        if (!user?.id) return;
        handledCheckoutSessionRef.current = sessionId;
        localStorage.removeItem(PAID_LISTING_CHECKOUT_KEY);

        base44.functions.invoke("residentialStripeCheckout", {
          action: "verify",
          session_id: sessionId,
        }).then(async (response) => {
          if (response?.data?.paid || response?.data?.stripe_paid) {
            if (stored.formData?.listingType === "yard_sale" && stored.formData?.selectedRangeStartDate) {
              const conflict = await checkDateConflictLive(stored.formData.selectedRangeStartDate, stored.formData.selectedRangeEndDate, stored.formData.listingType);
              if (conflict) {
                setIsStartingPayment(false);
                setPaymentError("These dates are already reserved for this address. Please choose different dates or edit your existing listing.");
                toast.error("These dates are already reserved for this address.");
                return;
              }
            }
            setPaymentError("");
            toast.success(response?.data?.paid ? "Payment successful." : "Payment received — creating your listing now.");
            executeSubmit("paid_success_pending_link", normalizeResidentialEventSingleDay({
              ...stored.formData,
              pending_checkout_session_id: sessionId,
              payment_intent_status: "hold_requested",
            }));
          } else {
            setIsStartingPayment(false);
            const pendingMessage = "Payment could not be confirmed. No listing was created.";
            setPaymentError(pendingMessage);
            toast.error(pendingMessage);
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

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const residentialStepLabels = ["Sale Details", "Your Location", "Tier & Schedule", isAdminCreate ? "Assign User" : "Payment"];
  const eventStepLabels = ["Event Info", "Location", "Date & Time", "Add-Ons", isAdminCreate ? "Assign User" : "Payment"];
  const stepLabels = isEventFlow ? eventStepLabels : residentialStepLabels;
  const totalSteps = isEventFlow ? 5 : 4;

  const stepMeta = {
    yard_sale:      { 1: "Tell buyers what you're selling", 2: "Confirm your sale address",      3: "Pick your visibility & schedule", 4: "Complete your listing" },
    neighborhood_sale: { 1: "Set up your event",            2: "Choose the sale area",            3: "Dates & details",                 4: "Payment setup" },
    event:          { 1: "Describe your event",             2: "Set the location",                3: "Add dates & times",               4: "Choose add-ons", 5: "Review & pay" },
  };
  const currentMeta = stepMeta[formData.listingType]?.[step] || "";

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">

        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            {isAdminCreate ? "Create Listing (Admin)" : formData.listingType === "event" ? "Create an Event" : formData.listingType === "neighborhood_sale" ? "Set Up a Neighborhood Sale" : "Post Your Yard Sale"}
          </h1>
          {currentMeta && <p className="text-slate-400 text-sm mt-1.5">{currentMeta}</p>}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    s < step
                      ? "bg-[#006168] text-white shadow-sm"
                      : s === step
                      ? "bg-[#006168] text-white ring-4 ring-[#006168]/20 shadow-md"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {s < step ? "✓" : s}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${s === step ? "text-[#006168]" : s < step ? "text-slate-500" : "text-slate-300"}`}>
                    {stepLabels[i]}
                  </span>
                </div>
                {s < totalSteps && (
                  <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-300 ${s < step ? "bg-[#006168]" : "bg-slate-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {formData.listingType === "yard_sale" && (
          <div className="mb-6 flex justify-center">
            <button type="button" onClick={() => setShowGuideModal(true)} className="text-xs text-[#006168] font-medium hover:text-[#004d52] underline underline-offset-2 transition-colors">
              Need tips for a great sale? View our Success Guide →
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden" ref={formContainerRef}>
          <FormScrollHelper containerRef={formContainerRef} />

          <div className="p-6 md:p-8">
            {formData.listingType === "event" && (
              <CreateListingEvent
                step={step}
                formData={formData}
                setFormData={setFormData}
                isAdminCreate={isAdminCreate}
                selectedUserForAdmin={selectedUserForAdmin}
                setSelectedUserForAdmin={setSelectedUserForAdmin}
                isAdminDemoMode={isAdminDemoMode}
                isStartingPayment={isStartingPayment}
                paymentError={paymentError}
                setPaymentError={setPaymentError}
                setStep={setStep}
                handlePaymentStepSubmit={handlePaymentStepSubmit}
              />
            )}
            {formData.listingType === "neighborhood_sale" && (
              <CreateListingNeighborhood
                step={step}
                formData={formData}
                setFormData={setFormData}
                setGeocodeRef={setGeocodeRef}
                user={user}
                reservedDates={reservedDates}
                isAdminCreate={isAdminCreate}
                selectedUserForAdmin={selectedUserForAdmin}
                setSelectedUserForAdmin={setSelectedUserForAdmin}
                isStartingPayment={isStartingPayment}
                paymentError={paymentError}
                setPaymentError={setPaymentError}
                setStep={setStep}
                handleNeighborhoodSetupSubmit={handleNeighborhoodSetupSubmit}
              />
            )}
            {formData.listingType === "yard_sale" && (
              <CreateListingResidential
                step={step}
                formData={formData}
                setFormData={setFormData}
                setGeocodeRef={setGeocodeRef}
                user={user}
                reservedDates={reservedDates}
                isAdminCreate={isAdminCreate}
                selectedUserForAdmin={selectedUserForAdmin}
                setSelectedUserForAdmin={setSelectedUserForAdmin}
                isAdminDemoMode={isAdminDemoMode}
                isStartingPayment={isStartingPayment}
                paymentError={paymentError}
                setPaymentError={setPaymentError}
                setStep={setStep}
                handlePaymentStepSubmit={handlePaymentStepSubmit}
                residentialTierPrices={RESIDENTIAL_TIER_PRICES}
                onAddressSelected={(selectedAddress) => {
                  if (!isAdminDemoMode && !isAdminCreate && !userHasVerifiedPrimaryAddress) {
                    setPendingHomeAddress(buildResolvedListingLocation(selectedAddress));
                    setShowHomeAddressConfirm(true);
                  }
                }}
                onResidentialConflictInteraction={markResidentialConflictInteraction}
              />
            )}

            {(step !== paymentStepNumber || isAdminCreate) && (
              <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-11"
                  >
                    ← Back
                  </Button>
                )}
                {(isAdminCreate ? step < paymentStepNumber : step < entryStepNumber) ? (
                  <Button
                    onClick={isAdminCreate && step === entryStepNumber ? () => setStep(paymentStepNumber) : handleNext}
                    disabled={step === 2 && formData.listingType !== "neighborhood_sale" && formData.listingType !== "event" && regularAddressIncomplete && !userHasVerifiedPrimaryAddress}
                    className="flex-1 bg-[#006168] hover:bg-[#004d52] text-white rounded-xl h-11 font-semibold shadow-sm"
                  >
                    Continue →
                  </Button>
                ) : (
                  <Button
                    onClick={isAdminCreate && step === paymentStepNumber ? () => {
                      if (!selectedUserForAdmin) {
                        toast.error("Please assign a user.");
                        return;
                      }
                      executeSubmit("admin_create");
                    } : () => handleSubmit({ userInitiated: true })}
                    disabled={createListingMutation.isPending || isStartingPayment}
                    className="flex-1 bg-[#006168] hover:bg-[#004d52] text-white rounded-xl h-11 font-semibold shadow-sm"
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
                      ? "Continue to Payment →"
                      : formData.listingType === "neighborhood_sale"
                      ? "Continue to Payment Setup →"
                      : ["featured", "premium"].includes(formData.tier)
                      ? "Continue to Payment →"
                      : "Publish Listing 🎉"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <NeighborhoodIntroModal open={showNeighborhoodIntro} onClose={() => setShowNeighborhoodIntro(false)} onContinue={() => { setShowNeighborhoodIntro(false); setStep(2); }} />
      <ConfirmHomeAddressModal
        open={showHomeAddressConfirm}
        address={getHomeAddressLabel(pendingHomeAddress || formData)}
        isConfirming={isConfirmingHomeAddress}
        onCancel={() => { setShowHomeAddressConfirm(false); setPendingHomeAddress(null); }}
        onConfirm={confirmSelectedHomeAddress}
      />

      <YardSaleGuideModal open={showGuideModal} onOpenChange={setShowGuideModal} />
      <ResidentialListingConflictDialog
        open={!!residentialConflict}
        conflict={residentialConflict}
        onClose={() => setResidentialConflict(null)}
        onRequested={() => queryClient.invalidateQueries({ queryKey: ["notifications"] })}
      />
      <DemoPaymentSkipDialog
        open={!!demoPaymentRequest}
        onOpenChange={(open) => !open && setDemoPaymentRequest(null)}
        onSkip={handleDemoPaymentSkip}
        onContinue={handleDemoPaymentContinue}
        isProcessing={isStartingPayment || createListingMutation.isPending}
      />
    </div>
  );
}