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

// Basic tier: Lucide outline icons with search metadata
export const EVENT_BASIC_ICON_LIBRARY = [
  // Sports
  { key: "football",    label: "Football",    lucide: "CircleDot",      keywords: ["sports", "football", "nfl"] },
  { key: "baseball",    label: "Baseball",    lucide: "Circle",         keywords: ["sports", "baseball", "mlb", "softball"] },
  { key: "basketball",  label: "Basketball",  lucide: "CircleDot",      keywords: ["sports", "basketball", "nba"] },
  { key: "soccer",      label: "Soccer",      lucide: "Globe",          keywords: ["sports", "soccer", "football"] },
  { key: "volleyball",  label: "Volleyball",  lucide: "CircleOff",      keywords: ["sports", "volleyball"] },
  { key: "tennis",      label: "Tennis",      lucide: "Dribbble",       keywords: ["sports", "tennis", "racket"] },
  { key: "golf",        label: "Golf",        lucide: "Flag",           keywords: ["sports", "golf"] },
  { key: "boxing",      label: "Boxing / MMA",lucide: "Swords",         keywords: ["sports", "boxing", "mma", "fighting", "wrestling"] },
  { key: "running",     label: "Track / Run", lucide: "Timer",          keywords: ["sports", "running", "track", "race", "5k"] },
  { key: "cheer",       label: "Cheer",       lucide: "Sparkles",       keywords: ["sports", "cheer", "cheerleading"] },
  { key: "trophy",      label: "Trophy",      lucide: "Trophy",         keywords: ["sports", "trophy", "award", "winner"] },
  // Food
  { key: "burger",      label: "Burger",      lucide: "Sandwich",       keywords: ["food", "burger", "bbq", "eat"] },
  { key: "taco",        label: "Taco",        lucide: "UtensilsCrossed",keywords: ["food", "taco", "mexican"] },
  { key: "bbq",         label: "BBQ / Grill", lucide: "Flame",          keywords: ["food", "bbq", "grill", "cookout"] },
  { key: "drink",       label: "Drink",       lucide: "GlassWater",     keywords: ["food", "drink", "beverage"] },
  { key: "coffee",      label: "Coffee",      lucide: "Coffee",         keywords: ["food", "coffee", "cafe"] },
  // Events
  { key: "calendar",    label: "Calendar",    lucide: "Calendar",       keywords: ["event", "calendar", "date", "general"] },
  { key: "ticket",      label: "Ticket",      lucide: "Ticket",         keywords: ["event", "ticket", "show", "entry"] },
  { key: "microphone",  label: "Microphone",  lucide: "Mic",            keywords: ["event", "microphone", "music", "performance", "speaker"] },
  { key: "music",       label: "Music",       lucide: "Music",          keywords: ["event", "music", "concert", "band"] },
  { key: "stage",       label: "Stage",       lucide: "Clapperboard",   keywords: ["event", "stage", "performance", "show"] },
  // Shopping / Market
  { key: "market",      label: "Market",      lucide: "ShoppingBag",    keywords: ["shopping", "market", "bag", "store", "pop_up"] },
  { key: "booth",       label: "Booth",       lucide: "Store",          keywords: ["shopping", "booth", "vendor", "market"] },
  { key: "cart",        label: "Cart",        lucide: "ShoppingCart",   keywords: ["shopping", "cart", "market"] },
  // Auto
  { key: "car",         label: "Car",         lucide: "Car",            keywords: ["auto", "car", "vehicle", "drive"] },
  { key: "truck",       label: "Truck",       lucide: "Truck",          keywords: ["auto", "truck", "vehicle"] },
  { key: "wrench",      label: "Wrench",      lucide: "Wrench",         keywords: ["auto", "wrench", "repair", "mechanic"] },
  // Home / Real Estate
  { key: "house",       label: "House",       lucide: "House",          keywords: ["home", "house", "real_estate", "property"] },
  { key: "key",         label: "Key",         lucide: "KeyRound",       keywords: ["home", "key", "real_estate", "open house"] },
  { key: "open_house",  label: "Open House",  lucide: "DoorOpen",       keywords: ["home", "open house", "real_estate"] },
  // Collectibles
  { key: "cards",       label: "Cards",       lucide: "Layers",         keywords: ["collectibles", "cards", "trading"] },
  { key: "comic",       label: "Comic",       lucide: "BookOpen",       keywords: ["collectibles", "comic", "book"] },
  { key: "toy",         label: "Toy",         lucide: "Package",        keywords: ["collectibles", "toy", "figurine"] },
  { key: "dice",        label: "Dice",        lucide: "Dices",          keywords: ["collectibles", "dice", "games", "board game"] },
  // Party
  { key: "balloons",    label: "Balloons",    lucide: "PartyPopper",    keywords: ["party", "balloon", "celebration"] },
  { key: "gift",        label: "Gift",        lucide: "Gift",           keywords: ["party", "gift", "present", "birthday"] },
  { key: "confetti",    label: "Confetti",    lucide: "Sparkles",       keywords: ["party", "confetti", "celebration"] },
  { key: "cake",        label: "Cake",        lucide: "Cake",           keywords: ["party", "cake", "birthday"] },
  // Community
  { key: "school",      label: "School",      lucide: "School",         keywords: ["community", "school", "education"] },
  { key: "church",      label: "Church",      lucide: "Church",         keywords: ["community", "church", "religious", "worship"] },
  { key: "fundraiser",  label: "Fundraiser",  lucide: "Heart",          keywords: ["community", "fundraiser", "charity", "nonprofit"] },
  { key: "charity",     label: "Charity",     lucide: "HeartHandshake", keywords: ["community", "charity", "donate", "fundraiser"] },
];

export const EVENT_BASIC_ICON_OPTIONS = EVENT_BASIC_ICON_LIBRARY.map((i) => i.key);
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