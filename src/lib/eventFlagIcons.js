export const EVENT_FLAG_ICONS = [
  { key: "football", label: "Youth Football", icon: "🏈", category: "Sports" },
  { key: "baseball", label: "Baseball", icon: "⚾", category: "Sports" },
  { key: "soccer", label: "Soccer", icon: "⚽", category: "Sports" },
  { key: "basketball", label: "Basketball", icon: "🏀", category: "Sports" },
  { key: "volleyball", label: "Volleyball", icon: "🏐", category: "Sports" },
  { key: "wrestling", label: "Wrestling", icon: "🤼", category: "Sports" },
  { key: "cornhole", label: "Cornhole", icon: "🎯", category: "Games" },
  { key: "food", label: "Food", icon: "🍔", category: "Event" },
  { key: "stage", label: "Stage / Show", icon: "🎭", category: "Event" },
  { key: "carnival", label: "Carnival", icon: "🎪", category: "Event" },
  { key: "parking", label: "Parking", icon: "🅿️", category: "Event" },
  { key: "collectibles", label: "Collectibles", icon: "🧸", category: "Market" },
  { key: "gaming", label: "Gaming", icon: "🎮", category: "Games" },
  { key: "music", label: "Music", icon: "🎵", category: "Event" },
  { key: "trophy", label: "Trophy / Awards", icon: "🏆", category: "Event" },
  { key: "halloween_decorations", label: "Halloween Decorations", image: "/assets/halloween/halloween-decorations.svg", category: "Halloween" },
  { key: "haunted", label: "Haunted House", image: "/assets/halloween/haunted-house.svg", category: "Halloween" },
  { key: "trick_or_treat", label: "Trick-or-Treat", image: "/assets/halloween/trick-or-treat.svg", category: "Halloween" },
  { key: "trunk_or_treat", label: "Trunk-or-Treat", image: "/assets/halloween/trunk-or-treat.svg", category: "Halloween" },
  { key: "scary_yard", label: "Scary Yard", image: "/assets/halloween/scary-yard.svg", category: "Halloween" },
  { key: "kid_friendly", label: "Kid Friendly", image: "/assets/halloween/kid-friendly.svg", category: "Halloween" },
  { key: "light_show", label: "Light Show", image: "/assets/halloween/light-show.svg", category: "Halloween" },
  { key: "must_see", label: "Must See", image: "/assets/halloween/must-see.svg", category: "Halloween" },
  { key: "no_candy_here", label: "No Candy Here", image: "/assets/halloween/no-candy-here.svg", category: "Halloween" },
  { key: "flag", label: "Flag", icon: "⚑", category: "General" },
];

export const getEventFlagIconItem = (key) => EVENT_FLAG_ICONS.find((item) => item.key === key);
export const getEventFlagIcon = (key) => getEventFlagIconItem(key)?.icon || "⚑";
export const getEventFlagIconAsset = (key) => getEventFlagIconItem(key)?.image || null;
export const getEventFlagIconLabel = (key) => getEventFlagIconItem(key)?.label || "Flag";
