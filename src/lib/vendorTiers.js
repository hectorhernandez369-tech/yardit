export const VENDOR_TIERS = {
  free: {
    label: "Free Vendor",
    price: "$0/month",
    monthlyPrice: 0,
    includedUsers: 1,
    includedPins: 1,
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
    eventAllowanceLabel: "Events sold separately",
    eventChoiceLabel: "Purchase Event Add-ons",
    eventAccessLabel: "Event creation is not included in vendor plans",
    eventAddOnAccess: true,
    dailyCheckInLimit: 1,
    fridayToSundayOnly: true,
    maxCheckInDurationHours: 4,
    logoPin: false,
    animation: false,
    hasLikeButton: true,
    mapZoom: 16,
    visibilityRange: "Close-range map visibility",
    visibilityPriority: "Basic visibility",
    organizerSearchBoost: 0,
    postUpdateLimitPerMonth: 0,
    scheduledLocations: false,
    notifyFollowersWhenLive: false,
    dealsAndSpecials: false,
    analyticsLevel: "none",
    featuredVendorPlacement: false,
    restrictions: ["1 check-in per day", "Friday–Sunday check-ins only", "4-hour maximum check-in", "Basic pin only"],
    extraUserPrice: null,
    extraPinPrice: null,
  },
  starter: {
    label: "Starter",
    price: "$12.99/month",
    monthlyPrice: 12.99,
    includedUsers: 1,
    includedPins: 1,
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
    eventAllowanceLabel: "Events sold separately",
    eventChoiceLabel: "Purchase Event Add-ons",
    eventAccessLabel: "Event creation is available as an add-on",
    eventAddOnAccess: true,
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    maxCheckInDurationHours: null,
    logoPin: false,
    animation: false,
    hasLikeButton: true,
    mapZoom: 15,
    visibilityRange: "Standard local visibility",
    visibilityPriority: "Standard visibility",
    organizerSearchBoost: 0,
    postUpdateLimitPerMonth: 4,
    scheduledLocations: false,
    notifyFollowersWhenLive: false,
    dealsAndSpecials: false,
    analyticsLevel: "none",
    featuredVendorPlacement: false,
    restrictions: ["4 public updates per month", "Basic pin only"],
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  pro: {
    label: "Pro",
    price: "$24.99/month",
    monthlyPrice: 24.99,
    includedUsers: 2,
    includedPins: 2,
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
    eventAllowanceLabel: "Events sold separately",
    eventChoiceLabel: "Purchase Event Add-ons",
    eventAccessLabel: "Event creation is available as an add-on",
    eventAddOnAccess: true,
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    maxCheckInDurationHours: null,
    logoPin: true,
    animation: false,
    hasLikeButton: true,
    mapZoom: 13,
    visibilityRange: "Neighborhood-wide visibility",
    visibilityPriority: "Higher visibility",
    organizerSearchBoost: 1,
    postUpdateLimitPerMonth: 12,
    scheduledLocations: true,
    notifyFollowersWhenLive: true,
    dealsAndSpecials: true,
    analyticsLevel: "basic",
    featuredVendorPlacement: false,
    restrictions: ["12 public updates per month", "Animated pins require Growth"],
    badge: "Most Popular",
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  growth: {
    label: "Growth",
    price: "$49.99/month",
    monthlyPrice: 49.99,
    includedUsers: 3,
    includedPins: 3,
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
    eventAllowanceLabel: "Events sold separately",
    eventChoiceLabel: "Purchase Event Add-ons",
    eventAccessLabel: "Event creation is available as an add-on",
    eventAddOnAccess: true,
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    maxCheckInDurationHours: null,
    logoPin: true,
    animation: true,
    hasLikeButton: true,
    mapZoom: 11,
    visibilityRange: "City and nearby-area visibility",
    visibilityPriority: "Highest vendor visibility",
    organizerSearchBoost: 2,
    postUpdateLimitPerMonth: null,
    scheduledLocations: true,
    notifyFollowersWhenLive: true,
    dealsAndSpecials: true,
    analyticsLevel: "advanced",
    featuredVendorPlacement: true,
    restrictions: [],
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
};

export const VENDOR_TIER_ORDER = ["free", "starter", "pro", "growth"];

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
    included_single_events: 0,
    included_multifield_events: 0,
    included_multi_spot_events: 0,
    included_multi_location_events: 0,
    label: tier.eventAllowanceLabel,
  };
}

export function getVendorMonthlyPostLimit(account) {
  return getVendorTierConfig(account?.vendor_tier).postUpdateLimitPerMonth;
}

export function canVendorCheckInToday(account, checkIns, now = new Date()) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  const day = now.getDay();

  if (tier.fridayToSundayOnly && ![5, 6, 0].includes(day)) {
    return { allowed: false, reason: `${tier.label} check-ins are available Friday through Sunday. Upgrade to Starter or higher to check in any day.` };
  }

  if (tier.dailyCheckInLimit) {
    const todayKey = now.toISOString().slice(0, 10);
    const usedToday = (checkIns || []).filter((item) => item.checkin_start_time?.slice(0, 10) === todayKey && item.status !== "ended").length;
    if (usedToday >= tier.dailyCheckInLimit) {
      return { allowed: false, reason: `${tier.label} includes ${tier.dailyCheckInLimit} check-in per day. Upgrade to Starter or higher for unlimited check-ins.` };
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
