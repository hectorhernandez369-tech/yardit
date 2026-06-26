import { shouldShowListingOnMainMap, normalizeNeighborhoodJoinStatus, deriveNeighborhoodEventState } from "@/lib/neighborhoodSaleState";

const TERMINAL_HIDDEN_STATUSES = new Set([
  "expired",
  "canceled",
  "cancelled",
  "deleted",
  "removed",
  "hidden",
  "suspended",
  "rejected",
  "closed",
  "completed",
]);

const NON_PUBLIC_DRAFT_STATUSES = new Set([
  "draft",
  "pending_payment",
  "payment_pending",
]);

const OWNER_PREVIEW_STATUSES = new Set([
  "active",
  "scheduled",
  "upcoming",
  "coming_soon",
  "pending",
  "under_review",
  "collecting_participants",
  "ready_for_payment",
  "payment_pending_adjustment",
  "activated",
  "activated_locked",
]);

const PUBLIC_PAYMENT_OK = new Set(["paid", "skipped_admin_promo", "waived"]);
const PUBLIC_PAYMENT_BLOCKED = new Set(["pending", "failed", "unpaid", "none", "canceled", "cancelled", "requires_payment_method", "requires_payment_action"]);
const PAID_TIERS = new Set(["basic", "featured", "premium", "marquee"]);
const COMING_SOON_TIERS = new Set(["premium", "marquee"]);

function getEffectiveTier(listing) {
  return listing?.listingType === "event" ? (listing?.event_tier || listing?.tier) : listing?.tier;
}

function relId(value) {
  if (!value) return null;
  if (typeof value === "object") return value.id || value._id || value.value || null;
  return String(value);
}

export function getListingOwnerId(listing) {
  return relId(
    listing?.ownerUserId ??
    listing?.owner_user_id ??
    listing?.owner_id ??
    listing?.user_id ??
    listing?.created_by_id ??
    listing?.created_by ??
    listing?.owner
  );
}

export function isListingOwnedByUser(listing, currentUser) {
  const ownerId = getListingOwnerId(listing);
  return !!ownerId && !!currentUser?.id && ownerId === String(currentUser.id);
}

function hasValidCoordinates(listing) {
  const lat = listing?.lat ?? listing?.latitude;
  const lng = listing?.lng ?? listing?.longitude;
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

function hasPreviewLabel(listing) {
  return !!(listing?.title || listing?.event_name || listing?.listingNumber || listing?.listingType);
}

function isTerminalHidden(listing, now = new Date()) {
  const status = listing?.status;
  if (TERMINAL_HIDDEN_STATUSES.has(status)) return true;
  if (listing?.canceled_at || listing?.cancelled_at || listing?.deleted_at || listing?.removed_at || listing?.expired_at) return true;
  if (listing?.endDateTime) {
    const end = new Date(listing.endDateTime);
    if (!Number.isNaN(end.getTime()) && now > end) return true;
  }
  return false;
}

function hasPublicPayment(listing) {
  if (listing?.listingType === "event") return true;
  const tier = getEffectiveTier(listing);
  if (!PAID_TIERS.has(tier)) return true;

  const paymentStatus = String(listing?.payment_status || "").toLowerCase();
  if (PUBLIC_PAYMENT_OK.has(paymentStatus)) return true;
  if (PUBLIC_PAYMENT_BLOCKED.has(paymentStatus)) return false;
  if (listing?.payment_intent_status === "captured") return true;

  return !paymentStatus;
}

function isNeighborhoodParticipant(listing) {
  const joinStatus = normalizeNeighborhoodJoinStatus(listing?.neighborhood_join_status);
  return !!listing?.neighborhood_sale_id || (!!joinStatus && joinStatus !== "none");
}

function getDateOnly(value, timeZoneId) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString("en-CA", { timeZone: timeZoneId || "UTC" });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function getTimeOnly(value, timeZoneId) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZoneId || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "";
  }
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getStoredVisibilityStartDate(listing) {
  const value = listing?.visibility_start_date;
  if (!value) return "";
  return String(value).slice(0, 10);
}

function hasStoredEarlyVisibility(listing) {
  return listing?.early_visibility_enabled === true && !!getStoredVisibilityStartDate(listing);
}

function isStoredEarlyVisibilityWindow(listing, now = new Date()) {
  if (!hasStoredEarlyVisibility(listing)) return false;
  const visibilityStartDate = getStoredVisibilityStartDate(listing);
  const listingStartDate = listing?.selectedRangeStartDate || getDateOnly(listing?.startDateTime, listing?.timeZoneId);
  if (!listingStartDate || visibilityStartDate > listingStartDate) return false;
  const today = getDateOnly(now, listing?.timeZoneId);
  return today >= visibilityStartDate && today < listingStartDate;
}

function isResidentialScheduledToday(listing, now = new Date()) {
  if (listing?.listingType !== "yard_sale") return false;

  const today = getDateOnly(now, listing?.timeZoneId);
  const activeDates = Array.isArray(listing?.activeDates) ? listing.activeDates : [];
  if (activeDates.length > 0) return activeDates.includes(today);

  const startDate = String(listing?.selectedRangeStartDate || getDateOnly(listing?.startDateTime, listing?.timeZoneId) || "").slice(0, 10);
  const endDate = String(listing?.selectedRangeEndDate || getDateOnly(listing?.endDateTime, listing?.timeZoneId) || startDate || "").slice(0, 10);
  return !!startDate && !!endDate && today >= startDate && today <= endDate;
}

function hasValidResidentialHours(listing, now = new Date()) {
  const openMinutes = minutesFromTime(listing?.openTime);
  const closeMinutes = minutesFromTime(listing?.closeTime);
  const currentMinutes = minutesFromTime(getTimeOnly(now, listing?.timeZoneId));
  const earliest = 5 * 60;
  const latest = 22 * 60;

  if (openMinutes === null || closeMinutes === null || currentMinutes === null) return false;
  if (openMinutes < earliest || closeMinutes > latest || openMinutes >= closeMinutes) return false;
  return true;
}

function isResidentialOpenNow(listing, now = new Date()) {
  if (listing?.listingType !== "yard_sale") return true;
  if (!isResidentialScheduledToday(listing, now)) return false;
  if (!hasValidResidentialHours(listing, now)) return false;

  const openMinutes = minutesFromTime(listing?.openTime);
  const closeMinutes = minutesFromTime(listing?.closeTime);
  const currentMinutes = minutesFromTime(getTimeOnly(now, listing?.timeZoneId));
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

export function isResidentialDailyPreviewMode(listing, now = new Date()) {
  if (listing?.listingType !== "yard_sale") return false;
  const publicDayStatuses = new Set(["active", "scheduled", "activated", "activated_locked"]);
  const isPublicDayStatus = publicDayStatuses.has(listing?.status) || listing?.activation_status === "active";
  if (!isPublicDayStatus) return false;
  if (!isResidentialScheduledToday(listing, now)) return false;
  if (!hasValidResidentialHours(listing, now)) return false;
  return !isResidentialOpenNow(listing, now);
}

function hasListingEarlyVisibilityPromoWindow(listing, now = new Date()) {
  if (listing?.listingType !== "yard_sale") return false;
  if (listing?.early_visibility_enabled !== true || !listing?.visibility_start_date) return false;
  const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
  const visibilityStart = new Date(`${String(listing.visibility_start_date).slice(0, 10)}T00:00:00`);
  if (!start || Number.isNaN(start.getTime()) || Number.isNaN(visibilityStart.getTime())) return false;
  if (visibilityStart > start) return false;
  return now >= visibilityStart && now < start;
}

export function isPremiumComingSoonPublicListing(listing, now = new Date()) {
  if (listing?.listingType === "event") {
    if (!hasValidCoordinates(listing) || isTerminalHidden(listing, now) || !hasPublicPayment(listing)) return false;
    const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
    if (!start || Number.isNaN(start.getTime()) || now >= start) return false;
    const earlyStart = listing?.coming_soon_start_date ? new Date(`${listing.coming_soon_start_date}T00:00:00`) : null;
    return !!earlyStart && !Number.isNaN(earlyStart.getTime()) && now >= earlyStart;
  }

  if (!hasValidCoordinates(listing) || isTerminalHidden(listing, now) || !hasPublicPayment(listing)) return false;

  if (hasListingEarlyVisibilityPromoWindow(listing, now)) return true;

  const tier = getEffectiveTier(listing);
  if (!COMING_SOON_TIERS.has(tier)) return false;

  if (listing?.listingType === "yard_sale") {
    if (isResidentialOpenNow(listing, now)) return false;
    if (isStoredEarlyVisibilityWindow(listing, now)) return true;

    const today = getDateOnly(now, listing?.timeZoneId);
    const earlyDates = Array.isArray(listing?.earlyVisibilityDates) ? listing.earlyVisibilityDates : [];
    if (earlyDates.includes(today)) return true;

    const activeDates = Array.isArray(listing?.activeDates) ? [...listing.activeDates].sort() : [];
    const firstActiveDate = activeDates[0] || listing?.selectedRangeStartDate;
    const earlyDays = Math.max(0, Number(listing?.earlyVisibilityDays || 0));

    if (firstActiveDate && earlyDays > 0) {
      const earlyStart = new Date(`${firstActiveDate}T00:00:00`);
      earlyStart.setDate(earlyStart.getDate() - earlyDays);
      const earlyStartDate = `${earlyStart.getFullYear()}-${String(earlyStart.getMonth() + 1).padStart(2, "0")}-${String(earlyStart.getDate()).padStart(2, "0")}`;
      return today >= earlyStartDate && today < firstActiveDate;
    }

    return false;
  }

  const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
  if (!start || Number.isNaN(start.getTime()) || now >= start) return false;

  const earlyStartValue = listing?.earlyVisibilityStartDateTime || listing?.coming_soon_start_date;
  if (earlyStartValue) {
    const earlyStart = new Date(earlyStartValue);
    if (!Number.isNaN(earlyStart.getTime()) && now >= earlyStart) return true;
  }

  const today = getDateOnly(now, listing?.timeZoneId);
  if (Array.isArray(listing?.earlyVisibilityDates) && listing.earlyVisibilityDates.includes(today)) return true;

  const earlyDays = Number(listing?.earlyVisibilityDays || 0);
  if (earlyDays > 0) {
    const computedEarlyStart = new Date(start);
    computedEarlyStart.setDate(computedEarlyStart.getDate() - earlyDays);
    return now >= computedEarlyStart;
  }

  return false;
}

export function getListingPublicVisibilityDecision(listing, context = {}) {
  const now = context.now instanceof Date ? context.now : new Date();
  const base = {
    listingId: listing?.id,
    listingNumber: listing?.listingNumber,
    ownerId: getListingOwnerId(listing),
    currentUserId: context.currentUser?.id || null,
    status: listing?.status,
    listingType: listing?.listingType,
    tier: getEffectiveTier(listing),
    paymentStatus: listing?.payment_status,
    startDateTime: listing?.startDateTime,
    endDateTime: listing?.endDateTime,
    passedPublicVisibility: false,
    passedOwnerPreviewVisibility: false,
    mode: "public",
    reason: "",
  };

  if (!listing) return { ...base, reason: "missing_listing" };
  if (NON_PUBLIC_DRAFT_STATUSES.has(listing?.status)) return { ...base, reason: "draft_or_payment_pending_hidden" };
  if (!hasValidCoordinates(listing)) return { ...base, reason: "missing_valid_coordinates" };
  if (isTerminalHidden(listing, now)) {
    if (context.enableDailyPreviewPins && isResidentialDailyPreviewMode(listing, now)) {
      return { ...base, passedPublicVisibility: true, reason: "public_daily_preview_visible" };
    }
    return { ...base, reason: "terminal_or_expired" };
  }

  if (listing.listingType === "neighborhood_sale") {
    const visible = shouldShowListingOnMainMap(listing, now);
    return { ...base, passedPublicVisibility: visible, reason: visible ? "public_neighborhood_sale_visible" : "public_neighborhood_sale_hidden" };
  }

  if (isNeighborhoodParticipant(listing)) return { ...base, reason: "neighborhood_participant_hidden_as_standalone" };
  if (!hasPublicPayment(listing)) return { ...base, reason: "payment_not_publicly_valid" };

  if (isPremiumComingSoonPublicListing(listing, now)) {
    return { ...base, passedPublicVisibility: true, reason: "public_coming_soon_visible" };
  }

  if (listing.listingType === "yard_sale" && !isResidentialOpenNow(listing, now)) {
    if (context.enableDailyPreviewPins && isResidentialDailyPreviewMode(listing, now)) {
      return { ...base, passedPublicVisibility: true, reason: "public_daily_preview_visible" };
    }
    return { ...base, reason: "outside_residential_open_hours" };
  }

  if (listing.listingType !== "event") {
    const isActiveStatus = listing.status === "active" || listing.activation_status === "active";
    const start = listing.startDateTime ? new Date(listing.startDateTime) : null;
    const end = listing.endDateTime ? new Date(listing.endDateTime) : null;
    const hasStarted = !start || Number.isNaN(start.getTime()) || now >= start;
    const hasNotEnded = !end || Number.isNaN(end.getTime()) || now <= end;

    if (isActiveStatus && hasStarted && hasNotEnded) {
      return { ...base, passedPublicVisibility: true, reason: "public_active_status_visible" };
    }
  }

  const visible = shouldShowListingOnMainMap(listing, now);
  if (!visible) return { ...base, reason: "failed_standard_public_map_rules" };

  if (listing.listingType !== "event" && listing.startDateTime) {
    const start = new Date(listing.startDateTime);
    if (!Number.isNaN(start.getTime()) && now < start) return { ...base, reason: "not_started_without_public_coming_soon" };
  }

  return { ...base, passedPublicVisibility: true, reason: "public_visible" };
}

export function isPubliclyVisibleListing(listing, context = {}) {
  return getListingPublicVisibilityDecision(listing, context).passedPublicVisibility;
}

export function getListingOwnerPreviewDecision(listing, currentUser, context = {}) {
  const now = context.now instanceof Date ? context.now : new Date();
  const base = {
    listingId: listing?.id,
    listingNumber: listing?.listingNumber,
    ownerId: getListingOwnerId(listing),
    currentUserId: currentUser?.id || null,
    status: listing?.status,
    listingType: listing?.listingType,
    tier: getEffectiveTier(listing),
    paymentStatus: listing?.payment_status,
    startDateTime: listing?.startDateTime,
    endDateTime: listing?.endDateTime,
    passedPublicVisibility: false,
    passedOwnerPreviewVisibility: false,
    mode: "owner_preview",
    reason: "",
  };

  if (!listing) return { ...base, reason: "missing_listing" };
  if (!isListingOwnedByUser(listing, currentUser)) return { ...base, reason: "not_listing_owner" };
  if (listing?.status === "draft") return { ...base, reason: "drafts_only_visible_in_my_listings" };
  if (isTerminalHidden(listing, now)) return { ...base, reason: "terminal_or_expired" };
  if (!hasValidCoordinates(listing)) return { ...base, reason: "missing_valid_coordinates" };
  if (!listing.listingType) return { ...base, reason: "missing_listing_type" };
  if (!hasPreviewLabel(listing)) return { ...base, reason: "missing_preview_label" };

  const status = listing.status || "active";
  if (!OWNER_PREVIEW_STATUSES.has(status)) return { ...base, reason: `status_not_previewable:${status}` };

  return { ...base, passedOwnerPreviewVisibility: true, reason: "owner_preview_visible" };
}

export function isOwnerPreviewVisibleListing(listing, currentUser, context = {}) {
  return getListingOwnerPreviewDecision(listing, currentUser, context).passedOwnerPreviewVisibility;
}

export function getListingMapVisibilityState(listing, currentUser, context = {}) {
  const now = context.now instanceof Date ? context.now : new Date();
  const publicDecision = getListingPublicVisibilityDecision(listing, { ...context, now, currentUser });
  if (publicDecision.passedPublicVisibility) {
    if (publicDecision.reason === "public_daily_preview_visible") return "daily_preview";
    if (listing?.listingType === "neighborhood_sale") {
      return deriveNeighborhoodEventState(listing, now) === "coming_soon" ? "coming_soon" : "active";
    }
    return isPremiumComingSoonPublicListing(listing, now) ? "coming_soon" : "active";
  }

  if (context.viewingOwnerPreviewMode) {
    const ownerDecision = getListingOwnerPreviewDecision(listing, currentUser, { ...context, now });
    if (ownerDecision.passedOwnerPreviewVisibility) return "preview";
  }

  return "hidden";
}

export function isListingVisible(listing, currentUser, context = {}) {
  return getListingMapVisibilityState(listing, currentUser, context) !== "hidden";
}

export function getListingVisibilityReason(listing, currentUser, context = {}) {
  const now = context.now instanceof Date ? context.now : new Date();
  const publicDecision = getListingPublicVisibilityDecision(listing, { ...context, now, currentUser });
  const ownerDecision = getListingOwnerPreviewDecision(listing, currentUser, { ...context, now });
  const activeDecision = publicDecision.passedPublicVisibility ? publicDecision : ownerDecision;
  return {
    ...activeDecision,
    passedPublicVisibility: publicDecision.passedPublicVisibility,
    passedOwnerPreviewVisibility: ownerDecision.passedOwnerPreviewVisibility,
    publicReason: publicDecision.reason,
    ownerPreviewReason: ownerDecision.reason,
    finalReason: publicDecision.passedPublicVisibility
      ? publicDecision.reason
      : ownerDecision.passedOwnerPreviewVisibility
      ? ownerDecision.reason
      : context.viewingOwnerPreviewMode
      ? ownerDecision.reason
      : publicDecision.reason,
  };
}

export function debugListingVisibility(listing, currentUser, context = {}) {
  if (!import.meta.env.DEV) return;
  if (context.debugVisibility === false) return;
  const details = getListingVisibilityReason(listing, currentUser, context);
  console.debug("[ListingVisibility]", details.finalReason, details);
}