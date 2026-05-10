export const TIER_CONFIG = {
  free: {
    name: "Free Vendor",
    price: "$0/month",
    max_pins: 1,
    max_users: 1,
    included_single_events: 0,
    included_multifield_events: 0,
  },
  starter: {
    name: "Starter",
    price: "$9.99/month",
    max_pins: 1,
    max_users: 1,
    included_single_events: 1,
    included_multifield_events: 0,
  },
  pro: {
    name: "Pro",
    price: "$19.99/month",
    max_pins: 1,
    max_users: 2,
    included_single_events: 3,
    included_multifield_events: 1,
  },
  growth: {
    name: "Growth",
    price: "$49.99/month",
    max_pins: 2,
    max_users: 3,
    included_single_events: 8,
    included_multifield_events: 3,
  },
  event_organizer: {
    name: "Event Organizer",
    price: "$99.99/month",
    max_pins: 5,
    max_users: 10,
    included_single_events: 20,
    included_multifield_events: 8,
  },
};

export function getTierLimits(tier = "free", extraPins = 0, extraUsers = 0) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const allowExtras = tier !== "free";
  return {
    max_pins: config.max_pins + (allowExtras ? Number(extraPins || 0) : 0),
    max_users: config.max_users + (allowExtras ? Number(extraUsers || 0) : 0),
    included_single_events: config.included_single_events,
    included_multifield_events: config.included_multifield_events,
  };
}