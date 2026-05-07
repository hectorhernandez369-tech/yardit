export const TIER_CONFIG = {
  starter: {
    name: "Starter",
    max_pins: 1,
    max_users: 1,
  },
  pro: {
    name: "Pro",
    max_pins: 3,
    max_users: 3,
  },
  growth: {
    name: "Growth",
    max_pins: 10,
    max_users: 10,
  },
};

export function getTierLimits(tier = "starter", extraPins = 0, extraUsers = 0) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.starter;
  return {
    max_pins: config.max_pins + Number(extraPins || 0),
    max_users: config.max_users + Number(extraUsers || 0),
  };
}