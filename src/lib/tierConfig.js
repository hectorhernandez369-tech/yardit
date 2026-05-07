export const TIER_CONFIG = {
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

export function getTierLimits(tier = "starter", extraPins = 0, extraUsers = 0) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.starter;
  return {
    max_pins: config.max_pins + Number(extraPins || 0),
    max_users: config.max_users + Number(extraUsers || 0),
  };
}