import { isHalloweenFullIconActive } from "@/lib/halloweenSpots";

const iconArt = {
  halloween_decorations: "🎃",
  haunted: "🏚️",
  trick_or_treat: "🍬",
  trunk_or_treat: "🚙",
  scary_yard: "🪦",
  kid_friendly: "👻",
  light_show: "💡",
  must_see: "⭐",
  no_candy_here: "🚫",
  coming_oct_1: "🎃",
};

const svgUrl = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
const previewIcon = (symbol) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><radialGradient id="g"><stop offset="0" stop-color="#f59e0b" stop-opacity=".22"/><stop offset="1" stop-color="#7e22ce" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="58" fill="url(#g)"/><text x="64" y="72" text-anchor="middle" dominant-baseline="middle" font-size="66" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${symbol}</text></svg>`);
const mapIcon = (symbol) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><text x="48" y="55" text-anchor="middle" dominant-baseline="middle" font-size="72" stroke="#21152b" stroke-width="3" paint-order="stroke" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${symbol}</text></svg>`);

export const HALLOWEEN_PREVIEW_ICON_ASSETS = Object.fromEntries(
  Object.entries(iconArt).map(([key, symbol]) => [key, previewIcon(symbol)])
);

export const HALLOWEEN_MAP_ICON_ASSETS = Object.fromEntries(
  Object.entries(iconArt).map(([key, symbol]) => [key, mapIcon(symbol)])
);

export const HALLOWEEN_DAYTIME_ICON = HALLOWEEN_MAP_ICON_ASSETS.halloween_decorations;

// Backward-compatible map alias for map-only consumers.
export const HALLOWEEN_ICON_ASSETS = HALLOWEEN_MAP_ICON_ASSETS;

export function getHalloweenSpotIconUrl(listing, now = new Date()) {
  if (!isHalloweenFullIconActive(listing, now)) return HALLOWEEN_DAYTIME_ICON;

  const teaserUntil = listing?.teaser_until ? new Date(listing.teaser_until) : null;
  const teaserExpired = teaserUntil && !Number.isNaN(teaserUntil.getTime()) && now > teaserUntil;
  if (listing?.custom_icon_url && !teaserExpired) return listing.custom_icon_url;

  const key = listing?.halloween_spot_type || listing?.halloween_icon_key || listing?.icon_key || listing?.seasonal_icon_key || "halloween_decorations";
  return HALLOWEEN_ICON_ASSETS[key] || HALLOWEEN_ICON_ASSETS.halloween_decorations;
}

export function getHalloweenSpotMapSize(listing, isSelected = false, now = new Date()) {
  const isFullIcon = isHalloweenFullIconActive(listing, now);
  if (!isFullIcon) return isSelected ? 32 : 28;
  return isSelected ? 54 : 48;
}