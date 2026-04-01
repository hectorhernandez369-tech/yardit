// All icons use Lucide React icon names (outline style).
// The `lucideIcon` field matches the exact export name from lucide-react.

export const EVENT_ICON_LIBRARY = [
  // ── Sports ──
  { key: "football",        lucideIcon: "Football",       label: "Football",        category: "sports",     tags: ["football","nfl","sport","game","team"] },
  { key: "basketball",      lucideIcon: "CircleDot",      label: "Basketball",      category: "sports",     tags: ["basketball","nba","sport","game","ball"] },
  { key: "soccer",          lucideIcon: "CircleDot",      label: "Soccer",          category: "sports",     tags: ["soccer","futbol","sport","ball","game"] },
  { key: "baseball",        lucideIcon: "Circle",         label: "Baseball",        category: "sports",     tags: ["baseball","mlb","sport","game","ball"] },
  { key: "tennis",          lucideIcon: "Activity",       label: "Tennis",          category: "sports",     tags: ["tennis","racket","sport","game"] },
  { key: "golf",            lucideIcon: "Flag",           label: "Golf",            category: "sports",     tags: ["golf","course","sport","club","flag"] },
  { key: "swimming",        lucideIcon: "Waves",          label: "Swimming",        category: "sports",     tags: ["swim","pool","water","sport","aquatic"] },
  { key: "running",         lucideIcon: "PersonStanding", label: "Running / 5K",    category: "sports",     tags: ["run","5k","race","jog","marathon","sport"] },
  { key: "cycling",         lucideIcon: "Bike",           label: "Cycling",         category: "sports",     tags: ["bike","bicycle","cycling","sport","race"] },
  { key: "fitness",         lucideIcon: "Dumbbell",       label: "Fitness",         category: "sports",     tags: ["gym","workout","fitness","weights","exercise"] },
  { key: "trophy",          lucideIcon: "Trophy",         label: "Tournament",      category: "sports",     tags: ["trophy","tournament","competition","award","champion"] },
  { key: "sport_generic",   lucideIcon: "Medal",          label: "Athletic Event",  category: "sports",     tags: ["sport","athletic","medal","event","competition"] },

  // ── Food & Drink ──
  { key: "food",            lucideIcon: "UtensilsCrossed",label: "Food / Dining",   category: "food",       tags: ["food","restaurant","eat","dining","meal"] },
  { key: "bbq",             lucideIcon: "Flame",          label: "BBQ / Grill",     category: "food",       tags: ["bbq","grill","cookout","barbecue","fire","food"] },
  { key: "coffee",          lucideIcon: "Coffee",         label: "Coffee",          category: "food",       tags: ["coffee","cafe","espresso","drink","morning"] },
  { key: "beer",            lucideIcon: "BeerIcon",       label: "Drinks",          category: "food",       tags: ["beer","drinks","bar","brewery","happy hour"] },
  { key: "bakery",          lucideIcon: "Cake",           label: "Bakery / Sweets", category: "food",       tags: ["bakery","cake","sweets","dessert","pastry"] },
  { key: "food_truck",      lucideIcon: "Truck",          label: "Food Truck",      category: "food",       tags: ["food truck","mobile food","catering","truck"] },
  { key: "pizza",           lucideIcon: "Pizza",          label: "Pizza",           category: "food",       tags: ["pizza","italian","food","slice"] },
  { key: "ice_cream",       lucideIcon: "IceCream",       label: "Ice Cream",       category: "food",       tags: ["ice cream","dessert","sweet","frozen","treat"] },

  // ── Market / Shopping ──
  { key: "market",          lucideIcon: "ShoppingBag",    label: "Market",          category: "shopping",   tags: ["market","shop","buy","sale","retail","flea"] },
  { key: "flea_market",     lucideIcon: "Store",          label: "Flea Market",     category: "shopping",   tags: ["flea market","vendor","stall","shop","secondhand"] },
  { key: "craft_fair",      lucideIcon: "Scissors",       label: "Craft Fair",      category: "shopping",   tags: ["craft","fair","handmade","art","artisan","market"] },
  { key: "garage_sale",     lucideIcon: "Tag",            label: "Garage Sale",     category: "shopping",   tags: ["garage sale","yard sale","tag sale","resale"] },
  { key: "farmers_market",  lucideIcon: "Leaf",           label: "Farmers Market",  category: "shopping",   tags: ["farmers market","produce","organic","fresh","food","vendor"] },
  { key: "pop_up_shop",     lucideIcon: "Tent",           label: "Pop-Up Shop",     category: "shopping",   tags: ["pop up","shop","temporary","booth","vendor","market"] },
  { key: "auction",         lucideIcon: "Gavel",          label: "Auction",         category: "shopping",   tags: ["auction","bid","gavel","sale","estate"] },

  // ── Auto ──
  { key: "car",             lucideIcon: "Car",            label: "Car",             category: "auto",       tags: ["car","auto","vehicle","automobile","drive"] },
  { key: "car_show",        lucideIcon: "CarFront",       label: "Car Show",        category: "auto",       tags: ["car show","auto show","classic car","exhibit","vehicle"] },
  { key: "truck",           lucideIcon: "Truck",          label: "Truck / RV",      category: "auto",       tags: ["truck","rv","vehicle","auto","trailer"] },
  { key: "motorcycle",      lucideIcon: "Bike",           label: "Motorcycle",      category: "auto",       tags: ["motorcycle","moto","bike","rally","ride"] },
  { key: "parking",         lucideIcon: "ParkingSquare",  label: "Parking / Lot",   category: "auto",       tags: ["parking","lot","garage","auto","event"] },

  // ── Home / Real Estate ──
  { key: "house",           lucideIcon: "Home",           label: "Home",            category: "real_estate",tags: ["house","home","real estate","property","residential"] },
  { key: "open_house",      lucideIcon: "DoorOpen",       label: "Open House",      category: "real_estate",tags: ["open house","real estate","tour","showing","home"] },
  { key: "building",        lucideIcon: "Building2",      label: "Building",        category: "real_estate",tags: ["building","commercial","office","property","real estate"] },
  { key: "neighborhood",    lucideIcon: "MapPin",         label: "Neighborhood",    category: "real_estate",tags: ["neighborhood","community","local","street","area"] },

  // ── Music / Entertainment ──
  { key: "music",           lucideIcon: "Music",          label: "Music / Concert", category: "entertainment",tags: ["music","concert","band","live","performance","show"] },
  { key: "microphone",      lucideIcon: "Mic",            label: "Open Mic / DJ",   category: "entertainment",tags: ["mic","dj","open mic","karaoke","performance","music"] },
  { key: "ticket",          lucideIcon: "Ticket",         label: "Event / Show",    category: "entertainment",tags: ["ticket","show","event","concert","performance","admission"] },
  { key: "theater",         lucideIcon: "Drama",          label: "Theater / Play",  category: "entertainment",tags: ["theater","play","drama","show","performing arts","stage"] },
  { key: "film",            lucideIcon: "Film",           label: "Film / Movie",    category: "entertainment",tags: ["film","movie","cinema","screening","documentary"] },
  { key: "comedy",          lucideIcon: "Laugh",          label: "Comedy",          category: "entertainment",tags: ["comedy","stand up","laugh","humor","show"] },
  { key: "dance",           lucideIcon: "Music2",         label: "Dance",           category: "entertainment",tags: ["dance","dancing","event","party","nightlife"] },
  { key: "gaming",          lucideIcon: "Gamepad2",       label: "Gaming",          category: "entertainment",tags: ["gaming","video game","arcade","esports","tournament"] },

  // ── Party / Family ──
  { key: "party",           lucideIcon: "PartyPopper",    label: "Party",           category: "party",      tags: ["party","celebration","fun","birthday","event"] },
  { key: "birthday",        lucideIcon: "Cake",           label: "Birthday",        category: "party",      tags: ["birthday","cake","celebration","party","anniversary"] },
  { key: "family",          lucideIcon: "Users",          label: "Family Event",    category: "party",      tags: ["family","kids","children","reunion","event"] },
  { key: "kids",            lucideIcon: "Baby",           label: "Kids / Children", category: "party",      tags: ["kids","children","baby","family","play","fun"] },
  { key: "wedding",         lucideIcon: "Heart",          label: "Wedding",         category: "party",      tags: ["wedding","marriage","ceremony","bridal","event"] },
  { key: "graduation",      lucideIcon: "GraduationCap",  label: "Graduation",      category: "party",      tags: ["graduation","school","diploma","ceremony","achievement"] },
  { key: "reunion",         lucideIcon: "UsersRound",     label: "Reunion",         category: "party",      tags: ["reunion","family","class reunion","gathering","event"] },

  // ── Collectibles ──
  { key: "collectibles",    lucideIcon: "Archive",        label: "Collectibles",    category: "collectibles",tags: ["collectibles","antiques","vintage","rare","items"] },
  { key: "antiques",        lucideIcon: "Clock",          label: "Antiques",        category: "collectibles",tags: ["antiques","vintage","old","collectibles","estate"] },
  { key: "cards",           lucideIcon: "CreditCard",     label: "Trading Cards",   category: "collectibles",tags: ["cards","trading cards","sports cards","pokemon","collectibles"] },
  { key: "coins",           lucideIcon: "Coins",          label: "Coins / Stamps",  category: "collectibles",tags: ["coins","stamps","numismatic","collectibles","rare"] },
  { key: "books",           lucideIcon: "BookOpen",       label: "Books",           category: "collectibles",tags: ["books","comics","reading","library","swap","sale"] },
  { key: "art",             lucideIcon: "Palette",        label: "Art",             category: "collectibles",tags: ["art","painting","gallery","exhibit","collectibles"] },
  { key: "jewelry",         lucideIcon: "Gem",            label: "Jewelry",         category: "collectibles",tags: ["jewelry","gems","rings","necklace","accessories","collectibles"] },

  // ── Community / School / Church ──
  { key: "community",       lucideIcon: "HandHeart",      label: "Community",       category: "community",  tags: ["community","volunteer","neighborhood","local","service"] },
  { key: "school",          lucideIcon: "School",         label: "School",          category: "community",  tags: ["school","education","class","student","academic"] },
  { key: "church",          lucideIcon: "Church",         label: "Church",          category: "community",  tags: ["church","religious","worship","faith","service","community"] },
  { key: "fundraiser",      lucideIcon: "HandCoins",      label: "Fundraiser",      category: "community",  tags: ["fundraiser","charity","nonprofit","donation","cause"] },
  { key: "volunteer",       lucideIcon: "HeartHandshake", label: "Volunteer",       category: "community",  tags: ["volunteer","service","community","help","charity"] },
  { key: "meeting",         lucideIcon: "Users",          label: "Meeting / Club",  category: "community",  tags: ["meeting","club","group","association","community"] },
  { key: "parade",          lucideIcon: "Flag",           label: "Parade / March",  category: "community",  tags: ["parade","march","community","holiday","celebration"] },

  // ── General / Pop-Up ──
  { key: "calendar",        lucideIcon: "CalendarDays",   label: "General Event",   category: "general",    tags: ["event","general","calendar","date","schedule"] },
  { key: "megaphone",       lucideIcon: "Megaphone",      label: "Announcement",    category: "general",    tags: ["announcement","megaphone","notice","public","broadcast"] },
  { key: "map_pin",         lucideIcon: "MapPin",         label: "Location Event",  category: "general",    tags: ["location","place","meet","popup","event","local"] },
  { key: "outdoor",         lucideIcon: "TreePine",       label: "Outdoor / Park",  category: "general",    tags: ["outdoor","park","nature","festival","picnic","event"] },
  { key: "festival",        lucideIcon: "Sun",            label: "Festival",        category: "general",    tags: ["festival","fair","outdoor","community","event","fun"] },
  { key: "night_event",     lucideIcon: "Moon",           label: "Night Event",     category: "general",    tags: ["night","evening","event","nightlife","concert"] },
  { key: "conference",      lucideIcon: "Presentation",   label: "Conference",      category: "general",    tags: ["conference","seminar","lecture","workshop","business","event"] },
  { key: "workshop",        lucideIcon: "Wrench",         label: "Workshop",        category: "general",    tags: ["workshop","diy","class","learn","hands-on","event"] },
  { key: "raffle",          lucideIcon: "Ticket",         label: "Raffle / Lottery",category: "general",    tags: ["raffle","lottery","prize","draw","fun","event"] },
  { key: "holiday",         lucideIcon: "Gift",           label: "Holiday",         category: "general",    tags: ["holiday","gift","seasonal","celebration","christmas","event"] },
];

// Flat list of all keys (used by existing logic)
export const ALL_ICON_KEYS = EVENT_ICON_LIBRARY.map((i) => i.key);

// Lookup by key
export const ICON_BY_KEY = Object.fromEntries(EVENT_ICON_LIBRARY.map((i) => [i.key, i]));

// Search helper — returns filtered list
export function searchIcons(query) {
  if (!query || !query.trim()) return EVENT_ICON_LIBRARY;
  const q = query.toLowerCase().trim();
  return EVENT_ICON_LIBRARY.filter(
    ({ key, label, category, tags }) =>
      key.includes(q) ||
      label.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q) ||
      tags.some((t) => t.includes(q))
  );
}