// Account-specific access, checked against the authenticated, immutable user ID.
// This is not a User role or a client-editable profile field.
export const DEVELOPER_USER_ID = '690f554506edf795e5d84122';

export function isDeveloperAccount(user) {
  return user?.id === DEVELOPER_USER_ID;
}

export function isDeveloperListing(listing) {
  return isDeveloperAccount({ id: listing?.ownerUserId }) &&
    listing?.payment_status === 'waived' &&
    listing?.is_demo_listing !== true &&
    listing?.assisted_listing !== true &&
    listing?.created_by_admin !== true;
}