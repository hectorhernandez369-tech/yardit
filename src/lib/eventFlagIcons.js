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
  { key: "haunted", label: "Haunted House", icon: "👻", category: "Event" },
  { key: "carnival", label: "Carnival", icon: "🎪", category: "Event" },
  { key: "parking", label: "Parking", icon: "🅿️", category: "Event" },
  { key: "collectibles", label: "Collectibles", icon: "🧸", category: "Market" },
  { key: "gaming", label: "Gaming", icon: "🎮", category: "Games" },
  { key: "music", label: "Music", icon: "🎵", category: "Event" },
  { key: "trophy", label: "Trophy / Awards", icon: "🏆", category: "Event" },
  { key: "flag", label: "Flag", icon: "⚑", category: "General" },
];

export const getEventFlagIcon = (key) => EVENT_FLAG_ICONS.find((item) => item.key === key)?.icon || "⚑";
export const getEventFlagIconLabel = (key) => EVENT_FLAG_ICONS.find((item) => item.key === key)?.label || "Flag";