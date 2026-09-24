import { VENDOR_TIERS, getVendorTierConfig } from "@/lib/vendorTiers";

export const TIER_CONFIG = Object.fromEntries(
  Object.entries(VENDOR_TIERS).map(([key, tier]) => [key, {
    name: tier.label,
    price: tier.price,
    max_pins: tier.includedPins,
    max_users: tier.includedUsers,
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
  }])
);

export function getTierLimits(tier = "free", extraPins = 0, extraUsers = 0) {
  const config = getVendorTierConfig(tier);
  const allowExtras = tier !== "free";
  return {
    max_pins: config.includedPins + (allowExtras ? Number(extraPins || 0) : 0),
    max_users: config.includedUsers + (allowExtras ? Number(extraUsers || 0) : 0),
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
  };
}
