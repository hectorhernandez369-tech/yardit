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

const OWNER_PREVIEW_STATUSES = new Set([
  "active",
  "scheduled",
  "upcoming",
  "coming_soon",
  "pending",
  "draft",
  "under_review",
  "collecting_participants",
  "ready_for_payment",
  "payment_pending",
  "payment_pending_adjustment",
  "activated",
  "activated_locked",
]);

const PUBLIC_PAYMENT_OK = new Set(["paid", "skipped_admin_promo", "waived"]);
const PUBLIC_PAYMENT_BLOCKED = new Set(["pending", "failed", "unpaid", "none", "canceled", "cancelled", "requires_payment_method", "requires_payment_action"]);
const PAID_TIERS = new Set(["basic", "featured", "premium", "marquee"]);
const COMING_SOON_TIERS = new Set(["premium", "marquee"]);

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
  const tier = listing?.event_tier || listing?.tier;
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

export function isPremiumComingSoonPublicListing(listing, now = new Date()) {
  const tier = listing?.event_tier || listing?.tier;
  if (!COMING_SOON_TIERS.has(tier)) return false;
  if (!hasValidCoordinates(listing) || isTerminalHidden(listing, now) || !hasPublicPayment(listing)) return false;

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
    tier: listing?.event_tier || listing?.tier,
    paymentStatus: listing?.payment_status,
    startDateTime: listing?.startDateTime,
    endDateTime: listing?.endDateTime,
    passedPublicVisibility: false,
    passedOwnerPreviewVisibility: false,
    mode: "public",
    reason: "",
  };

  if (!listing) return { ...base, reason: "missing_listing" };
  if (isTerminalHidden(listing, now)) return { ...base, reason: "terminal_or_expired" };
  if (!hasValidCoordinates(listing)) return { ...base, reason: "missing_valid_coordinates" };

  if (listing.listingType === "neighborhood_sale") {
    const visible = shouldShowListingOnMainMap(listing, now);
    return { ...base, passedPublicVisibility: visible, reason: visible ? "public_neighborhood_sale_visible" : "public_neighborhood_sale_hidden" };
  }

  if (isNeighborhoodParticipant(listing)) return { ...base, reason: "neighborhood_participant_hidden_as_standalone" };
  if (!hasPublicPayment(listing)) return { ...base, reason: "payment_not_publicly_valid" };

  if (isPremiumComingSoonPublicListing(listing, now)) {
    return { ...base, passedPublicVisibility: true, reason: "public_coming_soon_visible" };
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
    tier: listing?.event_tier || listing?.tier,
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