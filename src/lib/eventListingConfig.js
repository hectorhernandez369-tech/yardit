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
  { key: "trophy",      label: "Sports Event",  lucide: "Trophy",       keywords: ["sports", "trophy", "award", "winner", "game", "tournament"] },
  { key: "tennis",      label: "Tennis",        lucide: "Dribbble",     keywords: ["sports", "tennis", "racket", "ball"] },
  { key: "golf",        label: "Golf",          lucide: "Flag",         keywords: ["sports", "golf", "hole", "course"] },
  { key: "boxing",      label: "Combat Sports", lucide: "Swords",       keywords: ["sports", "boxing", "mma", "fighting", "wrestling", "martial arts"] },
  { key: "running",     label: "Race / Run",    lucide: "Timer",        keywords: ["sports", "running", "track", "race", "5k", "marathon"] },
  // Food & Drink
  { key: "food",        label: "Food Event",    lucide: "Sandwich",     keywords: ["food", "eat", "lunch", "dinner", "meal", "market"] },
  { key: "bbq",         label: "BBQ / Cookout", lucide: "Flame",        keywords: ["food", "bbq", "grill", "cookout", "outdoor"] },
  { key: "drink",       label: "Drinks",        lucide: "GlassWater",   keywords: ["food", "drink", "beverage", "bar", "water"] },
  { key: "coffee",      label: "Coffee / Café", lucide: "Coffee",       keywords: ["food", "coffee", "cafe", "espresso", "brunch"] },
  { key: "utensils",    label: "Dining",        lucide: "UtensilsCrossed", keywords: ["food", "dining", "restaurant", "dinner", "catering"] },
  // Entertainment & Events
  { key: "ticket",      label: "Ticketed Event",lucide: "Ticket",       keywords: ["event", "ticket", "show", "entry", "admission"] },
  { key: "music",       label: "Music",         lucide: "Music",        keywords: ["event", "music", "concert", "band", "live"] },
  { key: "microphone",  label: "Live Show",     lucide: "Mic",          keywords: ["event", "microphone", "performance", "speaker", "standup"] },
  { key: "stage",       label: "Film / Cinema", lucide: "Clapperboard", keywords: ["event", "film", "cinema", "movie", "screening", "show"] },
  { key: "calendar",    label: "General Event", lucide: "Calendar",     keywords: ["event", "calendar", "date", "general", "other"] },
  // Shopping & Market
  { key: "market",      label: "Market / Sale", lucide: "ShoppingBag",  keywords: ["shopping", "market", "bag", "store", "pop_up", "sale", "vendor"] },
  { key: "booth",       label: "Vendor Booth",  lucide: "Store",        keywords: ["shopping", "booth", "vendor", "market", "stall"] },
  { key: "cart",        label: "Shop / Sale",   lucide: "ShoppingCart", keywords: ["shopping", "cart", "market", "sale", "retail"] },
  // Auto
  { key: "car",         label: "Car Show",      lucide: "Car",          keywords: ["auto", "car", "vehicle", "drive", "show", "cars"] },
  { key: "truck",       label: "Trucks",        lucide: "Truck",        keywords: ["auto", "truck", "vehicle", "food truck"] },
  { key: "wrench",      label: "Auto Service",  lucide: "Wrench",       keywords: ["auto", "wrench", "repair", "mechanic", "service"] },
  // Home / Real Estate
  { key: "house",       label: "House",         lucide: "House",        keywords: ["home", "house", "real_estate", "property", "neighborhood"] },
  { key: "open_house",  label: "Open House",    lucide: "DoorOpen",     keywords: ["home", "open house", "real_estate", "showing"] },
  { key: "key",         label: "Real Estate",   lucide: "KeyRound",     keywords: ["home", "key", "real_estate", "property", "listing"] },
  // Collectibles & Games
  { key: "dice",        label: "Games / Tabletop", lucide: "Dices",     keywords: ["collectibles", "dice", "games", "board game", "tabletop", "rpg"] },
  { key: "comic",       label: "Books / Comics",lucide: "BookOpen",     keywords: ["collectibles", "comic", "book", "reading", "library"] },
  { key: "goods",       label: "Goods / Items", lucide: "Package",      keywords: ["collectibles", "goods", "items", "box", "sell", "stuff"] },
  // Party & Celebration
  { key: "balloons",    label: "Party",         lucide: "PartyPopper",  keywords: ["party", "balloon", "celebration", "event"] },
  { key: "cake",        label: "Birthday",      lucide: "Cake",         keywords: ["party", "cake", "birthday", "celebration"] },
  { key: "gift",        label: "Gift Exchange", lucide: "Gift",         keywords: ["party", "gift", "present", "birthday", "holiday", "exchange"] },
  { key: "sparkle",     label: "Celebration",   lucide: "Sparkles",     keywords: ["party", "celebration", "special", "sparkle", "festive"] },
  // Community
  { key: "school",      label: "School",        lucide: "School",       keywords: ["community", "school", "education", "graduation", "learning"] },
  { key: "church",      label: "Church / Faith",lucide: "Church",       keywords: ["community", "church", "religious", "worship", "faith"] },
  { key: "charity",     label: "Charity / Cause", lucide: "HeartHandshake", keywords: ["community", "charity", "donate", "fundraiser", "nonprofit", "cause"] },
  { key: "heart",       label: "Community",     lucide: "Heart",        keywords: ["community", "local", "neighborhood", "support", "together"] },
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