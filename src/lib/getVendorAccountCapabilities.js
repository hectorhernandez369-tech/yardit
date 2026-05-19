/**
 * getVendorAccountCapabilities(vendorAccount)
 *
 * Returns all feature gates and limits for a single VendorAccount
 * based solely on that account's own tier and add-ons.
 *
 * IMPORTANT: Never pass a user object here. Capabilities are per-business,
 * not per-user. An authorized user on a Starter business gets Starter features
 * inside that business, regardless of what tier their own businesses may be on.
 */

import { VENDOR_TIERS, VENDOR_TIER_ORDER, getVendorTierConfig } from "@/lib/vendorTiers";

export function getVendorAccountCapabilities(vendorAccount) {
  const tierKey = vendorAccount?.vendor_tier || "free";
  const tier = getVendorTierConfig(tierKey);
  const allowAddOns = tierKey !== "free";

  const includedUsers = Number(tier.includedUsers || 0);
  const includedPins = Number(tier.includedPins || 0);
  const extraUsers = allowAddOns ? Number(vendorAccount?.extra_users_count || 0) : 0;
  const extraPins = allowAddOns ? Number(vendorAccount?.extra_pins_count || 0) : 0;

  return {
    // ─── Identity ────────────────────────────────────────────────
    tierKey,
    tierLabel: tier.label,
    tierIndex: Math.max(0, VENDOR_TIER_ORDER.indexOf(tierKey)),

    // ─── User / Pin limits ───────────────────────────────────────
    maxUsers: includedUsers + extraUsers,
    maxPins: includedPins + extraPins,
    includedUsers,
    includedPins,
    extraUsersCount: extraUsers,
    extraPinsCount: extraPins,

    // ─── Event allowances ────────────────────────────────────────
    includedSingleEvents: Number(tier.included_single_events || 0),
    includedMultiSpotEvents: Number(tier.included_multi_spot_events || 0),
    includedMultiLocationEvents: Number(tier.included_multi_location_events || 0),
    includedMultiFieldEvents: Number(tier.included_multifield_events || 0),

    // ─── Feature flags ───────────────────────────────────────────
    logoPin: !!tier.logoPin,
    animation: !!tier.animation,
    hasLikeButton: !!tier.hasLikeButton,
    fridayToSundayOnly: !!tier.fridayToSundayOnly,
    dailyCheckInLimit: tier.dailyCheckInLimit || null,
    maxCheckInDurationHours: tier.maxCheckInDurationHours || null,

    // ─── Visibility ──────────────────────────────────────────────
    mapZoom: tier.mapZoom,
    visibilityRange: tier.visibilityRange,
    visibilityPriority: tier.visibilityPriority,

    // ─── Pricing helpers ─────────────────────────────────────────
    extraUserPrice: tier.extraUserPrice,
    extraPinPrice: tier.extraPinPrice,

    // ─── Subscription status on THIS account ─────────────────────
    subscriptionStatus: vendorAccount?.subscription_status || "inactive",
    stripeCustomerId: vendorAccount?.stripe_customer_id || null,
    stripeSubscriptionId: vendorAccount?.stripe_subscription_id || null,

    // ─── Raw tier config (for any extra reads) ───────────────────
    tierConfig: tier,
  };
}

/**
 * Quick helper: get just the tier key for a vendor account.
 * Use this for all feature-gate checks — never read user.vendor_tier.
 */
export function getAccountTierKey(vendorAccount) {
  return vendorAccount?.vendor_tier || "free";
}