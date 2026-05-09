export const TRUST_ACTIONS = {
  CREATE_LISTING: "create_listing",
  JOIN_NEIGHBORHOOD_SALE: "join_neighborhood_sale",
  SEND_ORGANIZER_REQUEST: "send_organizer_request",
  REQUEST_EVENT_JOIN: "request_event_join",
  ADD_EXTERNAL_LINK: "add_external_link",
};

export function getTrustStatus(user) {
  const hasAddress = !!(
    user?.primary_address &&
    typeof user?.primary_latitude === "number" &&
    typeof user?.primary_longitude === "number"
  );

  return {
    emailVerified: user?.email_verified !== false,
    addressVerified: user?.primary_address_verified === true && hasAddress,
    listingRulesAccepted: user?.listing_rules_accepted === true,
  };
}

export function hasVerifiedPrimaryAddress(user) {
  return getTrustStatus(user).addressVerified;
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