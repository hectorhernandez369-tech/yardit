import { EVENT_TIERS, EVENT_TIER_PRICES, formatEventTierLabel } from "@/lib/eventListingConfig";

export const RESIDENTIAL_UPGRADE_PRICES = {
  free: 0,
  featured: 499,
  premium: 799,
};

export const RESIDENTIAL_UPGRADE_TIERS = [
  {
    value: "free",
    label: "Free",
    price: 0,
  },
  {
    value: "featured",
    label: "Featured",
    price: 499,
  },
  {
    value: "premium",
    label: "Premium",
    price: 799,
  },
];

function getResidentialRank(tier) {
  return ["free", "featured", "premium"].indexOf(tier);
}

function getEventRank(tier) {
  return ["basic", "featured", "premium", "marquee"].indexOf(tier);
}

export function getListingCurrentTier(listing) {
  if (listing?.listingType === "event") {
    return listing?.event_tier || listing?.tier || "basic";
  }
  return listing?.tier || "free";
}

export function getUpgradeOptions(listing) {
  const currentTier = getListingCurrentTier(listing);

  if (listing?.listingType === "event") {
    const currentRank = getEventRank(currentTier);
    return EVENT_TIERS.filter((tier) => getEventRank(tier.value) > currentRank).map((tier) => ({
      value: tier.value,
      label: tier.label,
      price: EVENT_TIER_PRICES[tier.value] || 0,
    }));
  }

  const currentRank = getResidentialRank(currentTier);
  return RESIDENTIAL_UPGRADE_TIERS.filter((tier) => getResidentialRank(tier.value) > currentRank);
}

export function getTierLabel(listing, tier) {
  if (listing?.listingType === "event") {
    return formatEventTierLabel(tier);
  }

  return String(tier || "free").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getUpgradePriceDifference(listing, targetTier) {
  const currentTier = getListingCurrentTier(listing);

  if (listing?.listingType === "event") {
    const currentPrice = EVENT_TIER_PRICES[currentTier] || 0;
    const targetPrice = EVENT_TIER_PRICES[targetTier] || 0;
    return Math.max(0, targetPrice - currentPrice);
  }

  const currentPrice = RESIDENTIAL_UPGRADE_PRICES[currentTier] || 0;
  const targetPrice = RESIDENTIAL_UPGRADE_PRICES[targetTier] || 0;
  return Math.max(0, targetPrice - currentPrice);
}

export function canSelfServeUpgrade(listing) {
  return getUpgradeOptions(listing).length > 0;
}