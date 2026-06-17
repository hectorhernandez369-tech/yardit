import { normalizeUser } from "@/lib/normalizeUser";

export const TRUST_ACTIONS = {
  CREATE_LISTING: "create_listing",
  JOIN_NEIGHBORHOOD_SALE: "join_neighborhood_sale",
  SEND_ORGANIZER_REQUEST: "send_organizer_request",
  REQUEST_EVENT_JOIN: "request_event_join",
  ADD_EXTERNAL_LINK: "add_external_link",
};

/**
 * Returns true only if BOTH conditions are met:
 * 1. address_verified / primary_address_verified flag is true
 * 2. All required address fields are present and non-blank
 *
 * This prevents a stale verified flag from granting access when
 * the actual address data has been cleared.
 */
export function computedAddressVerified(user) {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;

  const flagSet =
    normalizedUser.primary_address_verified === true ||
    normalizedUser.address_verified === true ||
    normalizedUser.address_confirmation_status === "confirmed";

  if (!flagSet) return false;

  const street = String(normalizedUser.street_address || "").trim();
  const city = String(normalizedUser.city || "").trim();
  const state = String(normalizedUser.state || "").trim();
  const zip = String(normalizedUser.zip_code || "").trim();
  const lat = normalizedUser.primary_latitude ?? normalizedUser.address_lat;
  const lng = normalizedUser.primary_longitude ?? normalizedUser.address_lng;

  return street.length > 0 && city.length > 0 && state.length > 0 && zip.length > 0 && typeof lat === "number" && typeof lng === "number";
}

export function getTrustStatus(user) {
  return {
    emailVerified: user?.email_verified !== false,
    addressVerified: computedAddressVerified(user),
    listingRulesAccepted: user?.listing_rules_accepted === true,
  };
}

export function hasVerifiedPrimaryAddress(user) {
  return computedAddressVerified(user);
}

export function isEmailVerified(user) {
  return getTrustStatus(user).emailVerified;
}

export function hasAgreedToListingRules(user) {
  return getTrustStatus(user).listingRulesAccepted;
}

export function canPerformTrustAction(user) {
  const trust = getTrustStatus(user);
  return trust.emailVerified && trust.addressVerified && trust.listingRulesAccepted;
}

export function clearStaleTrustProgress() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("yardit_trust_verification_")) {
      localStorage.removeItem(key);
    }
  });
}