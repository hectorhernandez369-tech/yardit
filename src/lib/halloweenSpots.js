export const HALLOWEEN_DEFAULT_ACTIVATION_TIME = "15:00";
export const HALLOWEEN_DAYTIME_ICON = "/assets/halloween/daytime-pumpkin.svg";

export const HALLOWEEN_ICON_ASSETS = {
  halloween_decorations: "/assets/halloween/halloween-decorations.svg",
  haunted: "/assets/halloween/haunted-house.svg",
  trick_or_treat: "/assets/halloween/trick-or-treat.svg",
  trunk_or_treat: "/assets/halloween/trunk-or-treat.svg",
  scary_yard: "/assets/halloween/scary-yard.svg",
  kid_friendly: "/assets/halloween/kid-friendly.svg",
  light_show: "/assets/halloween/light-show.svg",
  must_see: "/assets/halloween/must-see.svg",
  no_candy_here: "/assets/halloween/no-candy-here.svg",
  coming_oct_1: "/assets/halloween/coming-oct-1.svg",
};

export function isHalloweenSpot(listing) {
  if (!listing) return false;
  return listing.listingType === "halloween_spot" || listing.listingType === "halloween_candy" || listing.type === "halloween_spot" || listing.type === "halloween_candy";
}

function minutesFromTimeString(value, fallback = HALLOWEEN_DEFAULT_ACTIVATION_TIME) {
  const raw = String(value || fallback);
  const [h, m] = raw.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 15 * 60;
  return h * 60 + m;
}

export function isHalloweenFullIconActive(listing, now = new Date()) {
  const activationTime = listing?.halloween_activation_time || listing?.full_icon_activation_time || listing?.viewing_start_time || HALLOWEEN_DEFAULT_ACTIVATION_TIME;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= minutesFromTimeString(activationTime);
}

export function getHalloweenSpotIconUrl(listing, now = new Date()) {
  if (!isHalloweenFullIconActive(listing, now)) return HALLOWEEN_DAYTIME_ICON;
  if (listing?.custom_icon_url) return listing.custom_icon_url;
  const key = listing?.halloween_icon_key || listing?.icon_key || listing?.seasonal_icon_key || "halloween_decorations";
  return HALLOWEEN_ICON_ASSETS[key] || HALLOWEEN_ICON_ASSETS.halloween_decorations;
}

export function getHalloweenSpotMapSize(listing, isSelected = false, now = new Date()) {
  const isFullIcon = isHalloweenFullIconActive(listing, now);
  if (!isFullIcon) return isSelected ? 22 : 18;
  return isSelected ? 38 : 34;
}