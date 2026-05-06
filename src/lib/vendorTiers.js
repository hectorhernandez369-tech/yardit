export const VENDOR_TIERS = {
  starter: {
    label: "Starter",
    price: "$9.99/month",
    includedUsers: 1,
    includedPins: 1,
    dailyCheckInLimit: 1,
    fridayToSundayOnly: true,
    logoPin: false,
    animation: false,
    mapZoom: 15,
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
  pro: {
    label: "Pro",
    price: "$19.99/month",
    includedUsers: 1,
    includedPins: 1,
    dailyCheckInLimit: null,
    fridayToSundayOnly: false,
    logoPin: true,
    animation: false,
    mapZoom: 13,
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
    mapZoom: 11,
    extraUserPrice: "$5/month",
    extraPinPrice: "$10/month",
  },
};

export function getVendorTierConfig(tier) {
  return VENDOR_TIERS[tier] || VENDOR_TIERS.starter;
}

export function getVendorUserLimit(account) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  return tier.includedUsers + Number(account?.extra_users_count || 0);
}

export function getVendorPinLimit(account) {
  const tier = getVendorTierConfig(account?.vendor_tier);
  return tier.includedPins + Number(account?.extra_pins_count || 0);
}

export function canStarterCheckInToday(checkIns, now = new Date()) {
  const day = now.getDay();
  if (![5, 6, 0].includes(day)) {
    return { allowed: false, reason: "Starter check-ins are available Friday through Sunday only. Upgrade to check in any day." };
  }

  const todayKey = now.toISOString().slice(0, 10);
  const usedToday = (checkIns || []).some((item) => item.checkin_start_time?.slice(0, 10) === todayKey);
  if (usedToday) {
    return { allowed: false, reason: "Starter includes 1 check-in per day. Upgrade for unlimited check-ins." };
  }

  return { allowed: true, reason: "" };
}

export function isLiveVendorCheckIn(checkIn) {
  if (checkIn?.status !== "live") return false;
  if (typeof checkIn?.checkin_latitude !== "number" || typeof checkIn?.checkin_longitude !== "number") return false;
  const end = new Date(checkIn?.checkin_end_time);
  return !Number.isNaN(end.getTime()) && end > new Date();
}