export const VENDOR_TIERS = {
  free: {
    label: "Free Vendor",
    price: "$0/month",
    includedUsers: 1,
    includedPins: 1,
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
    eventAllowanceLabel: "0 included events",
    eventChoiceLabel: "No included events",
    eventAccessLabel: "Events require a paid tier",
    dailyCheckInLimit: 1,
    fridayToSundayOnly: true,
    maxCheckInDurationHours: 4,
    logoPin: false,
    animation: false,
    hasLikeButton: false,
    mapZoom: 16,
    visibilityRange: "Visible around your block",
    visibilityPriority: "Basic visibility",
    restrictions: ["0 included events", "Friday–Sunday check-ins only", "No logo pins", "No animated pins"],
    extraUserPrice: null,
    extraPinPrice: null,
  },
  starter: {
    label: "Starter",
    price: "$9.99/month",
    includedUsers: 1,
    includedPins: 1,
    included_single_events: 1,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
    eventAllowanceLabel: "1 FREE Single Event per month",
    eventChoiceLabel: "1 Single Event/month",
    eventAccessLabel: "Single Events only",
    dailyCheckInLimit: 1,
    fridayToSundayOnly: true,
    maxCheckInDurationHours: null,
    logoPin: false,
    animation: false,
    hasLikeButton: true,
    mapZoom: 15,
    visibilityRange: "Visible around your block",
    visibilityPriority: "Starter visibility",
    restrictions: ["No Multi-Field Events", "No logo pins", "No animated pins"],
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  pro: {
    label: "Pro",
    price: "$19.99/month",
    includedUsers: 2,
    includedPins: 1,
    included_single_events: 3,
    included_multifield_events: 1,
    included_multi_spot_events: 1,
    included_multi_location_events: 1,
    eventAllowanceLabel: "Choose ONE: 3 Single Events OR 1 Multi-Field Event per month",
    eventChoiceLabel: "3 Single OR 1 Multi-Field/month",
    eventAccessLabel: "Single + Multi-Field Events",
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    logoPin: true,
    animation: false,
    maxCheckInDurationHours: null,
    hasLikeButton: true,
    mapZoom: 13,
    visibilityRange: "Visible across your neighborhood",
    visibilityPriority: "Higher visibility",
    restrictions: ["Monthly event allowance is limited; events are not unlimited"],
    badge: "Most Popular",
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  growth: {
    label: "Growth",
    price: "$49.99/month",
    includedUsers: 3,
    includedPins: 2,
    included_single_events: 8,
    included_multifield_events: 3,
    included_multi_spot_events: 3,
    included_multi_location_events: 3,
    eventAllowanceLabel: "Choose ONE: 8 Single Events OR 3 Multi-Field Events per month",
    eventChoiceLabel: "8 Single OR 3 Multi-Field/month",
    eventAccessLabel: "High-volume Single + Multi-Field Events",
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    logoPin: true,
    animation: true,
    maxCheckInDurationHours: null,
    hasLikeButton: true,
    mapZoom: 11,
    visibilityRange: "Visible across your city and nearby areas",
    visibilityPriority: "Premium business visibility",
    restrictions: ["Monthly event allowance is limited; events are not unlimited"],
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  event_organizer: {
    label: "Event Organizer",
    price: "$99.99/month",
    includedUsers: 10,
    includedPins: 5,
    included_single_events: 20,
    included_multifield_events: 8,
    included_multi_spot_events: 8,
    included_multi_location_events: 8,
    eventAllowanceLabel: "Choose ONE: 20 Single Events OR 8 Multi-Field Events per month",
    eventChoiceLabel: "20 Single OR 8 Multi-Field/month",
    eventAccessLabel: "Built for recurring organized events",
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    logoPin: true,
    animation: true,
    maxCheckInDurationHours: null,
    hasLikeButton: true,
    mapZoom: 10,
    visibilityRange: "Highest visibility priority",
    visibilityPriority: "Highest visibility priority",
    restrictions: ["Event allowances are monthly limits, not unlimited", "Designed for legitimate recurring organized events"],
    organizerMessage: "Built for recurring events",
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
};

export const VENDOR_TIER_ORDER = ["free", "starter", "pro", "growth", "event_organizer"];

export function getVendorTierConfig(tier) {
  return VENDOR_TIERS[tier] || VENDOR_TIERS.free;
}

export function getVendorUserLimit(account) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  return tier.includedUsers + (account?.vendor_tier === "free" ? 0 : Number(account?.extra_users_count || 0));
}

export function getVendorPinLimit(account) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  return tier.includedPins + (account?.vendor_tier === "free" ? 0 : Number(account?.extra_pins_count || 0));
}

export function getVendorEventAllowance(tierKey) {
  const tier = getVendorTierConfig(tierKey);
  return {
    included_single_events: tier.included_single_events,
    included_multifield_events: tier.included_multifield_events,
    included_multi_spot_events: tier.included_multi_spot_events,
    included_multi_location_events: tier.included_multi_location_events,
    label: tier.eventAllowanceLabel,
  };
}

export function canVendorCheckInToday(account, checkIns, now = new Date()) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  const day = now.getDay();

  if (tier.fridayToSundayOnly && ![5, 6, 0].includes(day)) {
    return { allowed: false, reason: `${tier.label} vendor check-ins are available Friday through Sunday. Upgrade to check in any day.` };
  }

  if (tier.dailyCheckInLimit) {
    const todayKey = now.toISOString().slice(0, 10);
    const usedToday = (checkIns || []).filter((item) => item.checkin_start_time?.slice(0, 10) === todayKey).length;
    if (usedToday >= tier.dailyCheckInLimit) {
      return { allowed: false, reason: `${tier.label} vendor accounts include ${tier.dailyCheckInLimit} check-in per day. Upgrade for unlimited check-ins.` };
    }
  }

  return { allowed: true, reason: "" };
}

export function canStarterCheckInToday(checkIns, now = new Date()) {
  return canVendorCheckInToday({ vendor_tier: "starter" }, checkIns, now);
}

export function isLiveVendorCheckIn(checkIn) {
  if (checkIn?.status !== "live") return false;
  if (typeof checkIn?.checkin_latitude !== "number" || typeof checkIn?.checkin_longitude !== "number") return false;
  const end = new Date(checkIn?.checkin_end_time);
  return !Number.isNaN(end.getTime()) && end > new Date();
}