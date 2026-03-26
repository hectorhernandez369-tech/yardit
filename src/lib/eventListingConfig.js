export const EVENT_CATEGORIES = [
  "sports",
  "pop_up",
  "food",
  "auto",
  "community",
  "real_estate",
  "school",
  "entertainment",
  "collectibles",
  "business",
  "religious",
  "private",
  "general",
];

export const EVENT_TIER_PRICES = {
  basic: 999,
  featured: 1499,
  premium: 2499,
  marquee: 3999,
};

export const EVENT_TIERS = [
  { value: "basic", label: "Basic", price: 999 },
  { value: "featured", label: "Featured", price: 1499 },
  { value: "premium", label: "Premium", price: 2499 },
  { value: "marquee", label: "Marquee", price: 3999 },
];

export const EVENT_ICON_EMOJIS = {
  football: "🏈",
  baseball: "⚾",
  soccer: "⚽",
  basketball: "🏀",
  market: "🛍️",
  food: "🍔",
  car: "🚗",
  house: "🏠",
  party: "🎉",
  ticket: "🎟️",
  calendar: "📅",
  collectibles: "🧸",
};

export const EVENT_ICONS = Object.keys(EVENT_ICON_EMOJIS);

export function getEventIconEmoji(icon) {
  return EVENT_ICON_EMOJIS[icon] || "📍";
}

export function formatEventTierLabel(tier) {
  if (!tier) return "Event";
  return String(tier).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getListingSortPriority(listing) {
  if (listing?.listingType === "event") {
    const eventPriority = { marquee: 1, premium: 2, featured: 3, basic: 4 };
    return eventPriority[listing?.event_tier || listing?.tier] || 4;
  }

  if (listing?.listingType === "neighborhood_sale") return 5;

  const defaultPriority = { premium: 6, featured: 7, free: 8 };
  return defaultPriority[listing?.tier] || 8;
}