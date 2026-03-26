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
  {
    value: "basic",
    label: "Basic",
    price: 999,
    summary: "Black and white outline icon, standard visibility, smallest event pin",
    features: ["Outline icon library", "Standard visibility", "Smallest event pin"],
  },
  {
    value: "featured",
    label: "Featured",
    price: 1499,
    summary: "Colored icon, larger pin, increased visibility, flyer upload",
    features: ["Colored icon library", "Larger event pin", "Increased visibility", "Flyer upload"],
  },
  {
    value: "premium",
    label: "Premium",
    price: 2499,
    summary: "Icon or uploaded logo/image, circular branded pin, higher visibility, flyer upload",
    features: ["Icon library or uploaded logo/image", "Circular branded pin", "Higher visibility", "Flyer upload"],
  },
  {
    value: "marquee",
    label: "Marquee",
    price: 3999,
    summary: "Marquee-style display, largest size, highest visibility, flyer upload",
    features: ["Marquee-style display", "Largest event size", "Highest visibility", "Flyer upload"],
  },
];

export const EVENT_CATEGORY_DEFAULT_ICONS = {
  sports: "soccer",
  pop_up: "market",
  food: "food",
  auto: "car",
  real_estate: "house",
  community: "party",
  collectibles: "collectibles",
  general: "calendar",
  school: "calendar",
  entertainment: "ticket",
  business: "market",
  religious: "calendar",
  private: "calendar",
};

export const EVENT_BASIC_ICON_OPTIONS = ["calendar", "ticket", "market", "food", "car", "house", "party", "collectibles"];
export const EVENT_COLORED_ICON_OPTIONS = ["football", "baseball", "soccer", "basketball", "market", "food", "car", "house", "party", "ticket", "calendar", "collectibles"];

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

export function getDefaultEventIconForCategory(category) {
  return EVENT_CATEGORY_DEFAULT_ICONS[category] || "calendar";
}

export function getEventIconOptionsForTier(tier) {
  if (tier === "basic") return EVENT_BASIC_ICON_OPTIONS;
  if (["featured", "premium"].includes(tier)) return EVENT_COLORED_ICON_OPTIONS;
  return [];
}

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