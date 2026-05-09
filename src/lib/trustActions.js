export const TRUST_ACTIONS = {
  CREATE_LISTING: "create_listing",
  JOIN_NEIGHBORHOOD_SALE: "join_neighborhood_sale",
  SEND_ORGANIZER_REQUEST: "send_organizer_request",
  REQUEST_EVENT_JOIN: "request_event_join",
  ADD_EXTERNAL_LINK: "add_external_link",
};

export function hasVerifiedPrimaryAddress(user) {
  return !!(
    user?.has_primary_address &&
    user?.primary_address &&
    typeof user?.primary_latitude === "number" &&
    typeof user?.primary_longitude === "number"
  );
}

export function isEmailVerified(user) {
  return user?.email_verified !== false;
}

export function hasAgreedToListingRules(user) {
  return !!user?.listing_rules_agreed_at;
}

export function canPerformTrustAction(user) {
  return isEmailVerified(user) && hasVerifiedPrimaryAddress(user) && hasAgreedToListingRules(user);
}