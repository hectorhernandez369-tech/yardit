import { isHalloweenFullIconActive } from "@/lib/halloweenSpots";

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