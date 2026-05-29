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
  if (!user) return false;

  const flagSet =
    user.primary_address_verified === true ||
    user.address_verified === true;

  if (!flagSet) return false;

  // Required fields must all be non-blank strings
  const street = String(user.street_address || "").trim();
  const city   = String(user.city || "").trim();
  const state  = String(user.state || "").trim();
  const zip    = String(user.zip_code || "").trim();

  return street.length > 0 && city.length > 0 && state.length > 0 && zip.length > 0;
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