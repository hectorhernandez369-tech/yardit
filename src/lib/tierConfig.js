export const TIER_CONFIG = {
  free: {
    name: "Free",
    price: "$0/month",
    max_pins: 1,
    max_users: 1,
  },
  starter: {
    name: "Starter",
    price: "$9.99/month",
    max_pins: 1,
    max_users: 1,
  },
  pro: {
    name: "Pro",
    price: "$19.99/month",
    max_pins: 1,
    max_users: 2,
  },
  growth: {
    name: "Growth",
    price: "$39.99/month",
    max_pins: 2,
    max_users: 3,
  },
};

export function getTierLimits(tier = "free", extraPins = 0, extraUsers = 0) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const allowExtras = tier !== "free";
  return {
    max_pins: config.max_pins + (allowExtras ? Number(extraPins || 0) : 0),
    max_users: config.max_users + (allowExtras ? Number(extraUsers || 0) : 0),
  };
}