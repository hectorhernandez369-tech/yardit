export const VENDOR_TIERS = {
  free: {
    label: "Free",
    price: "$0/month",
    includedUsers: 1,
    includedPins: 1,
    dailyCheckInLimit: 1,
    fridayToSundayOnly: true,
    maxCheckInDurationHours: 4,
    logoPin: false,
    animation: false,
    hasLikeButton: false,
    mapZoom: 16,
    visibilityRange: "Visible around your block",
    extraUserPrice: null,
    extraPinPrice: null,
  },
  starter: {
    label: "Starter",
    price: "$9.99/month",
    includedUsers: 1,
    includedPins: 1,
    dailyCheckInLimit: 1,
    fridayToSundayOnly: true,
    maxCheckInDurationHours: null,
    logoPin: false,
    animation: false,
    hasLikeButton: true,
    mapZoom: 15,
    visibilityRange: "Visible around your block",
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  pro: {
    label: "Pro",
    price: "$19.99/month",
    includedUsers: 2,
    includedPins: 1,
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    logoPin: true,
    animation: false,
    maxCheckInDurationHours: null,
    hasLikeButton: true,
    mapZoom: 13,
    visibilityRange: "Visible across your neighborhood",
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  growth: {
    label: "Growth",
    price: "$39.99/month",
    includedUsers: 3,
    includedPins: 2,
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    logoPin: true,
    animation: true,
    maxCheckInDurationHours: null,
    hasLikeButton: true,
    mapZoom: 11,
    visibilityRange: "Visible across your city and nearby areas",
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
};

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