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
  sports: "trophy",
  pop_up: "tent",
  food: "utensils",
  auto: "car",
  real_estate: "home",
  community: "megaphone",
  collectibles: "box",
  general: "calendar",
  school: "school",
  entertainment: "ticket",
  business: "store",
  religious: "church",
  private: "users",
};

// Lucide icon key mapped to { label, category, tags }
export const EVENT_ICON_REGISTRY = {
  // Sports
  trophy:           { label: "Trophy",          category: "sports",       tags: ["award", "win", "competition"] },
  medal:            { label: "Medal",            category: "sports",       tags: ["award", "first place"] },
  dumbbell:         { label: "Fitness",          category: "sports",       tags: ["gym", "workout", "crossfit"] },
  bike:             { label: "Cycling",          category: "sports",       tags: ["bicycle", "ride", "race"] },
  footprints:       { label: "Running",          category: "sports",       tags: ["5k", "marathon", "race", "walk"] },
  target:           { label: "Archery / Target", category: "sports",       tags: ["shooting", "range", "aim"] },
  activity:         { label: "Activity",         category: "sports",       tags: ["sports", "general", "fitness"] },
  flag:             { label: "Race / Finish",    category: "sports",       tags: ["race", "finish line", "competition"] },
  // Food & Drink
  utensils:         { label: "Restaurant",       category: "food",         tags: ["dinner", "lunch", "eat", "dining"] },
  "coffee":         { label: "Coffee",           category: "food",         tags: ["cafe", "espresso", "morning"] },
  pizza:            { label: "Pizza",            category: "food",         tags: ["italian", "food truck"] },
  "ice-cream":      { label: "Ice Cream",        category: "food",         tags: ["dessert", "sweet", "truck"] },
  cookie:           { label: "Bake Sale",        category: "food",         tags: ["baked goods", "pastry", "sweet"] },
  beer:             { label: "Brew / Bar",        category: "food",         tags: ["brewery", "bar", "pub", "festival"] },
  wine:             { label: "Wine",             category: "food",         tags: ["winery", "tasting", "vineyard"] },
  "sandwich":       { label: "Food Truck",       category: "food",         tags: ["street food", "lunch", "truck"] },
  // Market & Shopping
  store:            { label: "Store / Shop",     category: "market",       tags: ["retail", "boutique", "market"] },
  "shopping-bag":   { label: "Shopping",         category: "market",       tags: ["sale", "shop", "bag", "retail"] },
  tag:              { label: "Sale / Deals",     category: "market",       tags: ["discount", "yard sale", "price tag"] },
  package:          { label: "Goods / Products", category: "market",       tags: ["box", "delivery", "items"] },
  "archive":        { label: "Flea Market",      category: "market",       tags: ["thrift", "secondhand", "vintage"] },
  gem:              { label: "Jewelry",          category: "market",       tags: ["gems", "antique", "valuables"] },
  "book-open":      { label: "Book Sale",        category: "market",       tags: ["books", "library", "reading"] },
  // Auto
  car:              { label: "Car",              category: "auto",         tags: ["vehicle", "drive", "auto"] },
  "car-front":      { label: "Car Show",         category: "auto",         tags: ["classic car", "show", "vehicle"] },
  truck:            { label: "Truck",            category: "auto",         tags: ["vehicle", "pickup"] },
  wrench:           { label: "Auto Repair",      category: "auto",         tags: ["mechanic", "garage", "service"] },
  fuel:             { label: "Fuel / Gas",       category: "auto",         tags: ["gas station", "energy"] },
  // Home & Real Estate
  home:             { label: "Home",             category: "real_estate",  tags: ["house", "property", "yard sale"] },
  building:         { label: "Building",         category: "real_estate",  tags: ["office", "complex", "commercial"] },
  "building-2":     { label: "Open House",       category: "real_estate",  tags: ["real estate", "property"] },
  sofa:             { label: "Furniture",        category: "real_estate",  tags: ["interior", "decor", "home goods"] },
  lamp:             { label: "Home Goods",       category: "real_estate",  tags: ["decor", "interior", "household"] },
  hammer:           { label: "Renovation",       category: "real_estate",  tags: ["construction", "build", "DIY"] },
  // Music & Entertainment
  music:            { label: "Music",            category: "entertainment", tags: ["concert", "band", "show", "live"] },
  "music-2":        { label: "Concert",          category: "entertainment", tags: ["live music", "band", "performance"] },
  mic:              { label: "Microphone",       category: "entertainment", tags: ["karaoke", "speech", "comedy", "open mic"] },
  headphones:       { label: "DJ / Audio",       category: "entertainment", tags: ["dj", "dance", "club", "rave"] },
  ticket:           { label: "Ticket",           category: "entertainment", tags: ["event", "show", "admission"] },
  film:             { label: "Film / Cinema",    category: "entertainment", tags: ["movie", "screening", "theater"] },
  "tv":             { label: "Screening",        category: "entertainment", tags: ["watch party", "broadcast", "movie"] },
  drama:            { label: "Theater",          category: "entertainment", tags: ["play", "performance", "arts", "stage"] },
  // Party & Family
  party:            { label: "Party",            category: "party",        tags: ["birthday", "celebration", "fun"] },
  "cake":           { label: "Birthday",         category: "party",        tags: ["birthday cake", "celebration"] },
  baby:             { label: "Baby / Kids",      category: "party",        tags: ["children", "baby shower", "family"] },
  heart:            { label: "Valentine's",      category: "party",        tags: ["love", "romance", "wedding"] },
  "gift":           { label: "Gift / Giveaway",  category: "party",        tags: ["present", "prize", "raffle"] },
  users:            { label: "Family / Group",   category: "party",        tags: ["family", "reunion", "gathering"] },
  // Collectibles
  "box":            { label: "Collectibles",     category: "collectibles", tags: ["box", "items", "collection"] },
  star:             { label: "Rare / Special",   category: "collectibles", tags: ["rare", "special", "valuable"] },
  bookmark:         { label: "Memorabilia",      category: "collectibles", tags: ["sports cards", "memorabilia"] },
  camera:           { label: "Photography",      category: "collectibles", tags: ["camera", "photo", "vintage"] },
  gamepad:          { label: "Games / Toys",     category: "collectibles", tags: ["video games", "board games", "toys"] },
  "puzzle":         { label: "Puzzle / Games",   category: "collectibles", tags: ["puzzle", "toy", "game night"] },
  // Community / Church / School
  school:           { label: "School",           category: "community",    tags: ["education", "class", "learning"] },
  "graduation-cap": { label: "Graduation",       category: "community",    tags: ["school", "ceremony", "education"] },
  "book":           { label: "Education",        category: "community",    tags: ["class", "workshop", "learning"] },
  church:           { label: "Church",           category: "community",    tags: ["religious", "faith", "worship"] },
  "hand-heart":     { label: "Charity / Cause",  category: "community",    tags: ["nonprofit", "fundraiser", "donate"] },
  megaphone:        { label: "Announcement",     category: "community",    tags: ["community", "notice", "event"] },
  "vote":           { label: "Civic",            category: "community",    tags: ["town hall", "meeting", "government"] },
  // General / Pop-Up
  calendar:         { label: "Calendar",         category: "general",      tags: ["event", "date", "schedule"] },
  "map-pin":        { label: "Location / Place", category: "general",      tags: ["map", "venue", "meetup"] },
  zap:              { label: "Flash / Quick",    category: "general",      tags: ["pop up", "flash sale", "quick"] },
  "info":           { label: "General Event",    category: "general",      tags: ["event", "general", "info"] },
  "sparkles":       { label: "Special Event",    category: "general",      tags: ["special", "featured", "highlight"] },
  sun:              { label: "Outdoor",          category: "general",      tags: ["outdoors", "daytime", "festival"] },
  tent:             { label: "Festival / Fair",  category: "general",      tags: ["fair", "carnival", "outdoor", "festival"] },
  leaf:             { label: "Nature / Green",   category: "general",      tags: ["farmers market", "eco", "garden"] },
};

export const EVENT_BASIC_ICON_OPTIONS = Object.keys(EVENT_ICON_REGISTRY);
export const EVENT_COLORED_ICON_OPTIONS = Object.keys(EVENT_ICON_REGISTRY);

// Legacy emoji map — kept for backward compat with old icon keys on markers/boards
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

export const EVENT_ICONS = Object.keys(EVENT_ICON_REGISTRY);

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

export function getEventIconMeta(icon) {
  return EVENT_ICON_REGISTRY[icon] || null;
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