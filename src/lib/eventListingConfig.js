export const EVENT_CATEGORIES = [
  "Community",
  "Block Party",
  "Neighborhood Meetup",
  "School",
  "School Fundraiser",
  "Church",
  "Church Fundraiser",
  "Fundraiser",
  "Charity",
  "Charity Benefit",
  "Sports",
  "Sports Tournament",
  "5K / Run",
  "Golf Event",
  "Food",
  "BBQ / Cookout",
  "Food Truck Event",
  "Coffee / Brunch",
  "Entertainment",
  "Live Music",
  "Live Show",
  "Movie Night",
  "Family",
  "Kids Activity",
  "Birthday / Party",
  "Holiday",
  "Holiday Market",
  "Gift Exchange",
  "Craft Fair",
  "Art / Makers Market",
  "Vendor Market",
  "Car Show",
  "Open House",
  "Collectibles",
  "Games / Tabletop",
  "Other",
];

export const RESIDENTIAL_EVENT_BASE_PRICE = 999;

export const RESIDENTIAL_EVENT_ADD_ONS = {
  premium_visibility: { key: "premium_visibility", label: "Be Seen By More People", price: 199 },
  animation: { key: "animation", label: "Animation", price: 399 },
  flyer_upload: { key: "flyer_upload", label: "Flyer Upload", price: 299 },
  photo_gallery: { key: "photo_gallery", label: "Photo Gallery", price: 199 },
  custom_icon: { key: "custom_icon", label: "Custom Icon", price: 499 },
  marquee: { key: "marquee", label: "Marquee", price: 999 },
};

export const RESIDENTIAL_EVENT_COMING_SOON_PACKAGES = {
  "3": { key: "3", label: "3 Days", days: 3, price: 299 },
  "7": { key: "7", label: "7 Days", days: 7, price: 499 },
  "14": { key: "14", label: "14 Days", days: 14, price: 799 },
};

// Deprecated compatibility exports: Residential Events no longer use Basic/Featured/Premium/Marquee tiers.
export const EVENT_TIER_PRICES = { event: RESIDENTIAL_EVENT_BASE_PRICE };
export const EVENT_TIERS = [];

export const EVENT_CATEGORY_DEFAULT_ICONS = {
  Community: "heart",
  "Block Party": "balloons",
  "Neighborhood Meetup": "house",
  School: "school",
  "School Fundraiser": "school",
  Church: "church",
  "Church Fundraiser": "church",
  Fundraiser: "charity",
  Charity: "charity",
  "Charity Benefit": "charity",
  Sports: "trophy",
  "Sports Tournament": "trophy",
  "5K / Run": "running",
  "Golf Event": "golf",
  Holiday: "gift",
  "Holiday Market": "gift",
  "Gift Exchange": "gift",
  Food: "food",
  "BBQ / Cookout": "bbq",
  "Food Truck Event": "truck",
  "Coffee / Brunch": "coffee",
  Entertainment: "ticket",
  "Live Music": "music",
  "Live Show": "microphone",
  "Movie Night": "stage",
  Family: "balloons",
  "Kids Activity": "sparkle",
  "Birthday / Party": "cake",
  "Craft Fair": "goods",
  "Art / Makers Market": "market",
  "Vendor Market": "booth",
  "Car Show": "car",
  "Open House": "open_house",
  Collectibles: "collectibles",
  "Games / Tabletop": "dice",
  Other: "calendar",
  sports: "trophy",
  pop_up: "market",
  food: "food",
  auto: "car",
  real_estate: "house",
  community: "heart",
  collectibles: "collectibles",
  general: "calendar",
  school: "school",
  entertainment: "ticket",
  business: "market",
  religious: "church",
  private: "calendar",
};

export function getResidentialEventPriceBreakdown(formData = {}) {
  const addOns = formData.event_add_ons || {};
  const lines = [{ key: "base", label: "Base Event", price: RESIDENTIAL_EVENT_BASE_PRICE }];

  Object.values(RESIDENTIAL_EVENT_ADD_ONS).forEach((addOn) => {
    if (addOns[addOn.key]) lines.push(addOn);
  });

  const comingSoonPackage = RESIDENTIAL_EVENT_COMING_SOON_PACKAGES[String(formData.coming_soon_package || "")];
  if (comingSoonPackage) {
    lines.push({ key: `coming_soon_${comingSoonPackage.key}`, label: `Coming Soon — ${comingSoonPackage.label}`, price: comingSoonPackage.price });
  }

  const total = lines.reduce((sum, line) => sum + Number(line.price || 0), 0);
  return { basePrice: RESIDENTIAL_EVENT_BASE_PRICE, addOns: lines.filter((line) => line.key !== "base"), lines, total };
}

export function getResidentialEventTotal(formData = {}) {
  return getResidentialEventPriceBreakdown(formData).total;
}

export function getResidentialEventVisibilityTier(listing = {}) {
  const addOns = listing.event_add_ons || {};
  if (addOns.marquee) return "marquee";
  if (addOns.premium_visibility) return "premium";
  return "featured";
}

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

// Featured tier: large emoji-based icon library with search metadata
export const EVENT_FEATURED_ICON_LIBRARY = [
  // Sports
  { key: "football",      emoji: "🏈", label: "Football",         keywords: ["sports", "football", "nfl", "game", "tailgate"] },
  { key: "baseball",      emoji: "⚾", label: "Baseball",         keywords: ["sports", "baseball", "mlb", "game", "diamond"] },
  { key: "soccer",        emoji: "⚽", label: "Soccer",           keywords: ["sports", "soccer", "futbol", "football", "game"] },
  { key: "basketball",    emoji: "🏀", label: "Basketball",       keywords: ["sports", "basketball", "nba", "hoops", "game"] },
  { key: "volleyball",    emoji: "🏐", label: "Volleyball",       keywords: ["sports", "volleyball", "beach", "net", "game"] },
  { key: "tennis_ball",   emoji: "🎾", label: "Tennis",           keywords: ["sports", "tennis", "racket", "court", "match"] },
  { key: "golf_flag",     emoji: "⛳", label: "Golf",             keywords: ["sports", "golf", "course", "hole", "club"] },
  { key: "bowling",       emoji: "🎳", label: "Bowling",          keywords: ["sports", "bowling", "lanes", "strike", "pins"] },
  { key: "boxing_glove",  emoji: "🥊", label: "Boxing / MMA",    keywords: ["sports", "boxing", "mma", "fighting", "combat"] },
  { key: "swimming",      emoji: "🏊", label: "Swimming",         keywords: ["sports", "swimming", "pool", "water", "race"] },
  { key: "cycling",       emoji: "🚴", label: "Cycling",          keywords: ["sports", "cycling", "bike", "race", "ride"] },
  { key: "running_shoe",  emoji: "👟", label: "Race / Run",       keywords: ["sports", "running", "5k", "marathon", "race", "track"] },
  { key: "trophy",        emoji: "🏆", label: "Tournament",       keywords: ["sports", "trophy", "tournament", "award", "championship"] },
  { key: "medal",         emoji: "🥇", label: "Competition",      keywords: ["sports", "medal", "competition", "award", "winner"] },
  { key: "hockey",        emoji: "🏒", label: "Hockey",           keywords: ["sports", "hockey", "ice", "puck", "rink"] },
  { key: "lacrosse",      emoji: "🥍", label: "Lacrosse",         keywords: ["sports", "lacrosse", "stick", "field"] },
  { key: "skiing",        emoji: "⛷️", label: "Skiing",           keywords: ["sports", "skiing", "snow", "winter", "mountain"] },
  // Food & Drink
  { key: "food",          emoji: "🍔", label: "Food Event",       keywords: ["food", "burger", "eat", "meal", "lunch", "dinner"] },
  { key: "pizza",         emoji: "🍕", label: "Pizza",            keywords: ["food", "pizza", "pie", "italian", "dinner"] },
  { key: "taco",          emoji: "🌮", label: "Tacos / Mexican",  keywords: ["food", "taco", "mexican", "fiesta", "lunch"] },
  { key: "bbq_food",      emoji: "🍖", label: "BBQ / Cookout",    keywords: ["food", "bbq", "grill", "cookout", "ribs", "outdoor"] },
  { key: "hot_dog",       emoji: "🌭", label: "Hot Dogs",         keywords: ["food", "hot dog", "frank", "ballpark", "grill"] },
  { key: "sushi",         emoji: "🍣", label: "Sushi / Japanese", keywords: ["food", "sushi", "japanese", "fish", "roll"] },
  { key: "ice_cream",     emoji: "🍦", label: "Ice Cream",        keywords: ["food", "ice cream", "dessert", "sweet", "summer"] },
  { key: "cake_food",     emoji: "🎂", label: "Cake / Bakery",    keywords: ["food", "cake", "bakery", "dessert", "sweet", "birthday"] },
  { key: "donut",         emoji: "🍩", label: "Donuts",           keywords: ["food", "donut", "pastry", "bakery", "sweet"] },
  { key: "corn",          emoji: "🌽", label: "Farmers Market",   keywords: ["food", "corn", "farmer", "market", "fresh", "produce", "vendor"] },
  { key: "coffee_cup",    emoji: "☕", label: "Coffee / Café",    keywords: ["food", "coffee", "cafe", "espresso", "brunch", "morning"] },
  { key: "wine",          emoji: "🍷", label: "Wine / Tasting",   keywords: ["food", "wine", "tasting", "vineyard", "drink", "bar"] },
  { key: "beer",          emoji: "🍺", label: "Beer / Brew",      keywords: ["food", "beer", "brewery", "brew", "bar", "drink"] },
  { key: "cocktail",      emoji: "🍸", label: "Cocktails",        keywords: ["food", "cocktail", "bar", "drink", "happy hour"] },
  { key: "food_truck",    emoji: "🚚", label: "Food Truck",       keywords: ["food", "truck", "mobile", "street food", "vendor"] },
  // Music & Entertainment
  { key: "ticket",        emoji: "🎟️", label: "Ticketed Event",  keywords: ["event", "ticket", "show", "admission", "entry"] },
  { key: "microphone",    emoji: "🎤", label: "Live Show",        keywords: ["event", "microphone", "performance", "concert", "show"] },
  { key: "music_note",    emoji: "🎵", label: "Music",            keywords: ["event", "music", "concert", "band", "live", "notes"] },
  { key: "guitar",        emoji: "🎸", label: "Guitar / Rock",    keywords: ["event", "guitar", "rock", "band", "music", "concert"] },
  { key: "piano",         emoji: "🎹", label: "Piano / Classical",keywords: ["event", "piano", "classical", "recital", "music"] },
  { key: "drum",          emoji: "🥁", label: "Drums / Percussion",keywords: ["event", "drum", "percussion", "band", "music"] },
  { key: "trumpet",       emoji: "🎺", label: "Brass / Jazz",     keywords: ["event", "trumpet", "jazz", "brass", "music"] },
  { key: "violin",        emoji: "🎻", label: "Violin / Orchestra",keywords: ["event", "violin", "orchestra", "classical", "music"] },
  { key: "dj",            emoji: "🎧", label: "DJ / Headphones",  keywords: ["event", "dj", "headphones", "electronic", "music", "dance"] },
  { key: "movie",         emoji: "🎬", label: "Film / Cinema",    keywords: ["event", "movie", "film", "cinema", "screening", "show"] },
  { key: "theater",       emoji: "🎭", label: "Theater / Drama",  keywords: ["event", "theater", "drama", "play", "performance", "arts"] },
  { key: "circus",        emoji: "🎪", label: "Circus / Festival",keywords: ["event", "circus", "festival", "fair", "carnival"] },
  { key: "video_game",    emoji: "🎮", label: "Gaming / Esports", keywords: ["event", "gaming", "esports", "video game", "tournament"] },
  { key: "dance",         emoji: "💃", label: "Dance / Show",     keywords: ["event", "dance", "show", "performance", "ballet", "recital"] },
  // Party & Celebration
  { key: "party",         emoji: "🎉", label: "Party",            keywords: ["party", "celebration", "confetti", "popper", "event"] },
  { key: "balloon",       emoji: "🎈", label: "Balloons",         keywords: ["party", "balloon", "birthday", "celebration"] },
  { key: "birthday",      emoji: "🎂", label: "Birthday",         keywords: ["party", "birthday", "cake", "celebration"] },
  { key: "fireworks",     emoji: "🎆", label: "Fireworks",        keywords: ["party", "fireworks", "4th of july", "celebration", "holiday"] },
  { key: "sparkler",      emoji: "✨", label: "Celebration",      keywords: ["party", "sparkle", "celebration", "special", "festive"] },
  { key: "champagne",     emoji: "🥂", label: "Toast / Gala",     keywords: ["party", "champagne", "gala", "toast", "celebration", "fancy"] },
  { key: "clapper",       emoji: "🎊", label: "Confetti",         keywords: ["party", "confetti", "celebration", "festive"] },
  // Market / Vendor / Shopping
  { key: "market",        emoji: "🛍️", label: "Market / Sale",   keywords: ["shopping", "market", "bag", "pop_up", "sale", "vendor"] },
  { key: "store",         emoji: "🏪", label: "Store / Shop",     keywords: ["shopping", "store", "shop", "vendor", "boutique"] },
  { key: "art_market",    emoji: "🖼️", label: "Art / Gallery",   keywords: ["shopping", "art", "gallery", "craft", "vendor", "market"] },
  { key: "craft",         emoji: "✂️", label: "Craft Fair",       keywords: ["shopping", "craft", "fair", "handmade", "market", "vendor"] },
  { key: "gem",           emoji: "💎", label: "Jewelry / Gems",   keywords: ["shopping", "jewelry", "gems", "accessories", "vendor"] },
  { key: "camera",        emoji: "📷", label: "Photography",      keywords: ["shopping", "photography", "camera", "show", "event"] },
  { key: "swap",          emoji: "🔄", label: "Swap / Trade",     keywords: ["shopping", "swap", "trade", "exchange", "market"] },
  // Auto
  { key: "car",           emoji: "🚗", label: "Car Show",         keywords: ["auto", "car", "vehicle", "show", "cars"] },
  { key: "race_car",      emoji: "🏎️", label: "Racing",          keywords: ["auto", "race", "car", "speed", "motorsport"] },
  { key: "motorcycle",    emoji: "🏍️", label: "Motorcycle",      keywords: ["auto", "motorcycle", "bike", "moto", "rally"] },
  { key: "truck_big",     emoji: "🚛", label: "Truck Show",       keywords: ["auto", "truck", "big rig", "show", "vehicle"] },
  { key: "classic_car",   emoji: "🚙", label: "Classic Cars",     keywords: ["auto", "classic", "vintage", "car", "show"] },
  { key: "electric_car",  emoji: "⚡", label: "EV / Electric",    keywords: ["auto", "electric", "ev", "tesla", "car"] },
  // Home / Real Estate
  { key: "house",         emoji: "🏠", label: "House",            keywords: ["home", "house", "real_estate", "property", "neighborhood"] },
  { key: "building",      emoji: "🏢", label: "Commercial",       keywords: ["home", "building", "office", "commercial", "real_estate"] },
  { key: "open_house",    emoji: "🔑", label: "Open House",       keywords: ["home", "open house", "key", "real_estate", "showing"] },
  { key: "neighborhood",  emoji: "🏘️", label: "Neighborhood",    keywords: ["home", "neighborhood", "community", "houses", "area"] },
  { key: "construction",  emoji: "🏗️", label: "Construction",    keywords: ["home", "construction", "build", "new home", "development"] },
  // Community / Church / School
  { key: "calendar",      emoji: "📅", label: "General Event",    keywords: ["event", "calendar", "date", "general", "other"] },
  { key: "school",        emoji: "🏫", label: "School",           keywords: ["community", "school", "education", "graduation", "learning"] },
  { key: "graduation",    emoji: "🎓", label: "Graduation",       keywords: ["community", "graduation", "school", "diploma", "ceremony"] },
  { key: "church_emoji",  emoji: "⛪", label: "Church / Faith",   keywords: ["community", "church", "religious", "worship", "faith"] },
  { key: "prayer",        emoji: "🙏", label: "Prayer / Worship", keywords: ["community", "prayer", "religious", "worship", "faith"] },
  { key: "charity_emoji", emoji: "❤️", label: "Charity / Cause", keywords: ["community", "charity", "donate", "fundraiser", "nonprofit"] },
  { key: "volunteer",     emoji: "🤝", label: "Volunteer",        keywords: ["community", "volunteer", "nonprofit", "give back", "help"] },
  { key: "flag",          emoji: "🚩", label: "Community Event",  keywords: ["community", "local", "neighborhood", "event", "together"] },
  { key: "park",          emoji: "🌳", label: "Outdoor / Park",   keywords: ["community", "park", "outdoor", "nature", "event"] },
  // Collectibles / Hobby
  { key: "collectibles",  emoji: "🧸", label: "Collectibles",     keywords: ["collectibles", "toys", "hobby", "items", "sell"] },
  { key: "comic_book",    emoji: "📚", label: "Books / Comics",   keywords: ["collectibles", "comic", "book", "reading", "hobby"] },
  { key: "vinyl",         emoji: "💿", label: "Records / Vinyl",  keywords: ["collectibles", "vinyl", "record", "music", "hobby"] },
  { key: "stamp",         emoji: "📮", label: "Stamps / Coins",   keywords: ["collectibles", "stamp", "coins", "hobby", "antique"] },
  { key: "puzzle",        emoji: "🧩", label: "Puzzles / Games",  keywords: ["collectibles", "puzzle", "games", "hobby", "tabletop"] },
  { key: "dice_emoji",    emoji: "🎲", label: "Tabletop / RPG",   keywords: ["collectibles", "dice", "tabletop", "rpg", "board game"] },
  { key: "robot",         emoji: "🤖", label: "Sci-Fi / Tech",    keywords: ["collectibles", "robot", "sci-fi", "tech", "hobby"] },
  { key: "palette",       emoji: "🎨", label: "Art / Craft",      keywords: ["collectibles", "art", "craft", "paint", "hobby", "creative"] },
];

export const EVENT_COLORED_ICON_OPTIONS = EVENT_FEATURED_ICON_LIBRARY.map((i) => i.key);

export const EVENT_ICON_EMOJIS = {
  // Legacy keys (kept for backward compat)
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
  // Extended from featured library
  ...Object.fromEntries(EVENT_FEATURED_ICON_LIBRARY.map((i) => [i.key, i.emoji])),
};

export const EVENT_ICONS = Object.keys(EVENT_ICON_EMOJIS);

export function getDefaultEventIconForCategory(category) {
  return EVENT_CATEGORY_DEFAULT_ICONS[category] || "calendar";
}

export function getEventIconOptionsForTier(tier) {
  if (["basic", "event"].includes(tier)) return EVENT_BASIC_ICON_OPTIONS;
  if (["featured", "premium", "custom_icon"].includes(tier)) return EVENT_COLORED_ICON_OPTIONS;
  return [];
}

export function getEventIconEmoji(icon) {
  return EVENT_ICON_EMOJIS[icon] || "📍";
}

// Inline SVG paths for Basic tier Lucide icons — used by map marker renderer
// Paths are from Lucide v0 (24x24 viewBox, stroke-based)
const BASIC_ICON_SVG_PATHS = {
  // Trophy
  trophy: `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
  // Dribbble (tennis)
  tennis: `<circle cx="12" cy="12" r="10"/><path d="M19.13 5.09C15.22 9.14 13 12 12 12s-3.22-2.86-7.13-6.91"/><path d="M4.87 18.91C8.78 14.86 11 12 12 12s3.22 2.86 7.13 6.91"/>`,
  // Flag (golf)
  golf: `<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>`,
  // Swords (combat)
  boxing: `<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/>`,
  // Timer (race/run)
  running: `<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>`,
  // Sandwich (food)
  food: `<path d="M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3"/><path d="M12 19H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.83"/><path d="m3 11 7.77-6.04a2 2 0 0 1 2.46 0L21 11H3z"/><path d="M12.97 19.77 7 15h12.5l-3.75 4.5a2 2 0 0 1-2.78.27z"/>`,
  // Flame (bbq)
  bbq: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
  // GlassWater (drinks)
  drink: `<path d="M15.2 22H8.8a2 2 0 0 1-2-1.79L5 3h14l-1.81 17.21A2 2 0 0 1 15.2 22Z"/><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0"/>`,
  // Coffee
  coffee: `<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>`,
  // UtensilsCrossed (dining)
  utensils: `<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/>`,
  // Ticket
  ticket: `<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>`,
  // Music note
  music: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
  // Mic
  microphone: `<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>`,
  // Clapperboard (film)
  stage: `<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 3.9"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>`,
  // Calendar
  calendar: `<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>`,
  // ShoppingBag (market)
  market: `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
  // Store (booth)
  booth: `<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>`,
  // ShoppingCart
  cart: `<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>`,
  // Car
  car: `<path d="M19 17H5v2H3v-4l2.5-7h13l2.5 7v4h-2v-2Z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M5.5 10h13"/>`,
  // Truck
  truck: `<path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11v12H5Z"/><rect width="4" height="4" x="14" y="13" rx="1"/><path d="M14 5h4l3 4v4h-7V5Z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>`,
  // Wrench
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  // House
  house: `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  // DoorOpen (open house)
  open_house: `<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.562Z"/>`,
  // KeyRound (real estate)
  key: `<circle cx="11" cy="11" r="4"/><path d="m21 21-4.3-4.3"/><path d="M11 15v4"/><path d="M13 17h-4"/>`,
  // Dices
  dice: `<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>`,
  // BookOpen
  comic: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  // Package
  goods: `<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>`,
  // PartyPopper
  balloons: `<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>`,
  // Cake
  cake: `<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4 12 2l5 2"/>`,
  // Gift
  gift: `<polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>`,
  // Sparkles
  sparkle: `<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>`,
  // School
  school: `<path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>`,
  // Church
  church: `<path d="m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2"/><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M18 22V5l-6-3-6 3v17"/><path d="M12 7v5"/><path d="M10 9h4"/>`,
  // HeartHandshake
  charity: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>`,
  // Heart
  heart: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`,
};

export function getBasicEventIconSvg(iconKey, size = 16, color = "#111827") {
  const paths = BASIC_ICON_SVG_PATHS[iconKey];
  if (!paths) return null;
  const strokeProps = `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ${strokeProps}>${paths}</svg>`;
}

export function formatEventTierLabel(tier) {
  if (!tier || tier === "event") return "Event";
  return String(tier).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getListingSortPriority(listing) {
  if (listing?.listingType === "event") {
    const eventPriority = { marquee: 1, premium: 2, featured: 3, event: 3 };
    return eventPriority[getResidentialEventVisibilityTier(listing)] || 3;
  }

  if (listing?.listingType === "neighborhood_sale") return 5;

  const defaultPriority = { premium: 6, featured: 7, free: 8 };
  return defaultPriority[listing?.tier] || 8;
}