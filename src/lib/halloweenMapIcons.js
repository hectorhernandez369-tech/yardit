import { isHalloweenFullIconActive } from "@/lib/halloweenSpots";

export const HALLOWEEN_DAYTIME_ICON = "/assets/halloween/daytime-pumpkin.svg";

const SPONSORED_HALLOWEEN_LOCATION_IDS = new Set(["6a905d6300f9f756bb52f257"]);

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

export function getHalloweenSpotMapSize(listing, isSelected = false, now = new Date(), zoom = 13) {
  const isFullIcon = isHalloweenFullIconActive(listing, now);
  const baseSize = isFullIcon ? (isSelected ? 38 : 34) : (isSelected ? 22 : 18);
  const zoomGrowth = Math.max(0, Math.min(4, Number(zoom) - 13));
  const sponsoredBoost = SPONSORED_HALLOWEEN_LOCATION_IDS.has(String(listing?.id)) ? 12 : 0;
  return baseSize + zoomGrowth * (isFullIcon ? 5 : 3) + sponsoredBoost;
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