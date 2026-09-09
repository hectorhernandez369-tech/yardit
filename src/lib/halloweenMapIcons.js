import { isHalloweenFullIconActive, isHalloweenTeaser } from "@/lib/halloweenSpots";
import { COMING_OCT_ONE_ICON } from "@/lib/comingOctOneIcon";
import { HALLOWEEN_AD_DEMO_ICONS, HALLOWEEN_SELECTED_ICON_ASSETS } from "@/lib/halloweenAdDemoIcons";

export const HALLOWEEN_DAYTIME_ICON = HALLOWEEN_AD_DEMO_ICONS.halloween_decorations;

const DINUBA_COMING_OCT_ONE_ID = "6a9f4b77bf56f8c88ee389d1";
const SPONSORED_HALLOWEEN_LOCATION_IDS = new Set([
  "6a905d6300f9f756bb52f257",
  DINUBA_COMING_OCT_ONE_ID,
]);

export const HALLOWEEN_ICON_ASSETS = {
  ...HALLOWEEN_AD_DEMO_ICONS,
  coming_oct_1: COMING_OCT_ONE_ICON,
};

function isComingOctOne(listing) {
  return listing?.halloween_icon_key === "coming_oct_1" || listing?.icon_key === "coming_oct_1" || listing?.seasonal_icon_key === "coming_oct_1";
}

function isDinubaComingOctOne(listing) {
  return String(listing?.id) === DINUBA_COMING_OCT_ONE_ID && isComingOctOne(listing);
}

function isAdDemoHalloween(listing) {
  return String(listing?.title || listing?.display_title || "").startsWith("AD DEMO —");
}

export function getHalloweenSpotIconUrl(listing, now = new Date(), isSelected = false) {
  if (isDinubaComingOctOne(listing)) return HALLOWEEN_ICON_ASSETS.coming_oct_1;
  const iconAssets = isSelected ? HALLOWEEN_SELECTED_ICON_ASSETS : HALLOWEEN_ICON_ASSETS;
  if (isAdDemoHalloween(listing)) {
    const demoKey = listing?.halloween_icon_key || listing?.halloween_spot_type || "halloween_decorations";
    return iconAssets[demoKey] || iconAssets.halloween_decorations;
  }
  const comingOctOneTeaser = isComingOctOne(listing) && isHalloweenTeaser(listing, now);
  if (!isHalloweenFullIconActive(listing, now) || comingOctOneTeaser) return isSelected ? HALLOWEEN_SELECTED_ICON_ASSETS.halloween_decorations : HALLOWEEN_DAYTIME_ICON;
  if (isComingOctOne(listing)) return HALLOWEEN_ICON_ASSETS.coming_oct_1;

  const teaserUntil = listing?.teaser_until ? new Date(listing.teaser_until) : null;
  const teaserExpired = teaserUntil && !Number.isNaN(teaserUntil.getTime()) && now > teaserUntil;
  if (listing?.custom_icon_url && (listing?.halloween_demo_force_live === true || !teaserExpired)) return listing.custom_icon_url;

  const key = listing?.halloween_spot_type || listing?.halloween_icon_key || listing?.icon_key || listing?.seasonal_icon_key || "halloween_decorations";
  return iconAssets[key] || iconAssets.halloween_decorations;
}

export function getHalloweenSpotMapSize(listing, isSelected = false, now = new Date(), zoom = 13) {
  const isFullIcon = isDinubaComingOctOne(listing) || isAdDemoHalloween(listing) || (isHalloweenFullIconActive(listing, now) && !(isComingOctOne(listing) && isHalloweenTeaser(listing, now)));
  const baseSize = isFullIcon ? (isSelected ? 38 : 34) : (isSelected ? 22 : 18);
  const zoomGrowth = Math.max(0, Math.min(4, Number(zoom) - 13));
  const size = baseSize + zoomGrowth * (isFullIcon ? 5 : 3);
  if (!SPONSORED_HALLOWEEN_LOCATION_IDS.has(String(listing?.id))) return size;
  if (isDinubaComingOctOne(listing)) return Math.round(size * 0.75) * 2;
  return size * 1.5;
}

function projectToMapPixels(lat, lng, zoom) {
  const scale = 256 * Math.pow(2, zoom);
  const sinLat = Math.max(-0.9999, Math.min(0.9999, Math.sin(Number(lat) * Math.PI / 180)));
  return {
    x: (Number(lng) + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

export function getHalloweenCollisionSizes(listings, zoom, selectedId) {
  const sizes = {};
  const candidates = listings.filter((listing) => Number.isFinite(Number(listing?.lat)) && Number.isFinite(Number(listing?.lng)));

  candidates.forEach((listing) => {
    if (listing?.listingType !== "halloween_candy" && listing?.type !== "halloween_candy") return;
    const desiredSize = getHalloweenSpotMapSize(listing, listing.id === selectedId, new Date(), zoom);
    if (isDinubaComingOctOne(listing)) {
      sizes[listing.id] = desiredSize;
      return;
    }
    const point = projectToMapPixels(listing.lat, listing.lng, zoom);
    let fittedSize = desiredSize;

    candidates.forEach((other) => {
      if (other.id === listing.id) return;
      const otherPoint = projectToMapPixels(other.lat, other.lng, zoom);
      const distance = Math.hypot(point.x - otherPoint.x, point.y - otherPoint.y);
      const otherSize = other?.listingType === "halloween_candy" || other?.type === "halloween_candy"
        ? getHalloweenSpotMapSize(other, other.id === selectedId, new Date(), zoom)
        : 34;
      fittedSize = Math.min(fittedSize, Math.max(12, 2 * (distance - otherSize / 2 - 2)));
    });

    sizes[listing.id] = Math.round(fittedSize);
  });

  return sizes;
}