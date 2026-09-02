import { isHalloweenFullIconActive } from "@/lib/halloweenSpots";

export const HALLOWEEN_DAYTIME_ICON = "/assets/halloween/daytime-pumpkin.svg";

export const HALLOWEEN_ICON_ASSETS = {
  halloween_decorations: "/assets/halloween/halloween-decorations-diecut.svg",
  haunted: "/assets/halloween/haunted-house-diecut.svg",
  trick_or_treat: "/assets/halloween/trick-or-treat-diecut.svg",
  trunk_or_treat: "/assets/halloween/trunk-or-treat-diecut.svg",
  scary_yard: "/assets/halloween/scary-yard-diecut.svg",
  kid_friendly: "/assets/halloween/kid-friendly-diecut.svg",
  light_show: "/assets/halloween/light-show-diecut.svg",
  must_see: "/assets/halloween/must-see-diecut.svg",
  no_candy_here: "/assets/halloween/no-candy-here-diecut.svg",
  coming_oct_1: "/assets/halloween/coming-oct-1-diecut.svg",
};

export function getHalloweenSpotIconUrl(listing, now = new Date()) {
  if (!isHalloweenFullIconActive(listing, now)) return HALLOWEEN_DAYTIME_ICON;

  const teaserUntil = listing?.teaser_until ? new Date(listing.teaser_until) : null;
  const teaserExpired = teaserUntil && !Number.isNaN(teaserUntil.getTime()) && now > teaserUntil;
  if (listing?.custom_icon_url && (listing?.halloween_demo_force_live === true || !teaserExpired)) return listing.custom_icon_url;

  const key = listing?.halloween_spot_type || listing?.halloween_icon_key || listing?.icon_key || listing?.seasonal_icon_key || "halloween_decorations";
  return HALLOWEEN_ICON_ASSETS[key] || HALLOWEEN_ICON_ASSETS.halloween_decorations;
}

export function getHalloweenSpotMapSize(listing, isSelected = false, now = new Date()) {
  const isFullIcon = isHalloweenFullIconActive(listing, now);
  if (!isFullIcon) return isSelected ? 22 : 18;
  return isSelected ? 38 : 34;
}
