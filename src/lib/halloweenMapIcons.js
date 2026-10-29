import { COMING_OCT_ONE_ICON, getComingDateIcon } from "@/lib/comingOctOneIcon";
import { HALLOWEEN_AD_DEMO_ICONS, HALLOWEEN_SELECTED_ICON_ASSETS } from "@/lib/halloweenAdDemoIcons";

export const HALLOWEEN_DAYTIME_ICON = HALLOWEEN_AD_DEMO_ICONS.halloween_decorations;

const ASHEVILLE_DECORATION_ADDRESS = "874 asheville st";
const SPECIAL_HALLOWEEN_LISTING_NUMBER = "CA3247-59de3";

export function isSpecialHalloweenIcon(listing) {
  const listingNumber = listing?.halloween_listing_number || listing?.listingNumber || listing?.listing_number || listing?.id;
  return String(listingNumber || "").toLowerCase() === SPECIAL_HALLOWEEN_LISTING_NUMBER.toLowerCase()
    || String(listingNumber || "").toLowerCase() === "ca3247-7ada1"
    || String(listing?.id || "") === "6adb91be6ce8b34434f7ada1";
}

export function isAshevilleDecorationSpot(listing) {
  const address = String(listing?.street_address || listing?.address || listing?.addressText || "").toLowerCase();
  return address.includes(ASHEVILLE_DECORATION_ADDRESS);
}

export function getHalloweenSpotMapOpacity() {
  // Map appearance stays active; listing and candy schedules remain unchanged.
  return 1;
}

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
  if (isDinubaComingOctOne(listing)) return getComingDateIcon(listing.halloween_start_date);
  if (isAshevilleDecorationSpot(listing) && listing?.custom_icon_url) return listing.custom_icon_url;
  const iconAssets = isSelected ? HALLOWEEN_SELECTED_ICON_ASSETS : HALLOWEEN_ICON_ASSETS;
  if (isAdDemoHalloween(listing)) {
    const demoKey = listing?.halloween_icon_key || listing?.halloween_spot_type || "halloween_decorations";
    return iconAssets[demoKey] || iconAssets.halloween_decorations;
  }
  // Keep each spot's existing artwork while displaying it at full map strength.
  if (isComingOctOne(listing)) return HALLOWEEN_ICON_ASSETS.coming_oct_1;

  const teaserUntil = listing?.teaser_until ? new Date(listing.teaser_until) : null;
  const teaserExpired = teaserUntil && !Number.isNaN(teaserUntil.getTime()) && now > teaserUntil;
  if (listing?.custom_icon_url && (listing?.halloween_demo_force_live === true || !teaserExpired)) return listing.custom_icon_url;

  const key = listing?.halloween_spot_type || listing?.halloween_icon_key || listing?.icon_key || listing?.seasonal_icon_key || "halloween_decorations";
  return iconAssets[key] || iconAssets.halloween_decorations;
}

export function getHalloweenSpotMapSize(listing, isSelected = false, now = new Date(), zoom = 13) {
  // All visible Halloween spots use active sizing, independent of activation hours.
  const baseSize = isSelected ? 38 : 34;
  const zoomGrowth = Math.max(0, Math.min(4, Number(zoom) - 13));
  const size = baseSize + zoomGrowth * 5;
  if (isSpecialHalloweenIcon(listing)) return Math.round(size * 1.5);
  if (isAshevilleDecorationSpot(listing)) return Math.round(size * 1.5);
  if (!SPONSORED_HALLOWEEN_LOCATION_IDS.has(String(listing?.id))) return size;
  if (isDinubaComingOctOne(listing)) return Math.round(size * 2);
  return size * 1.5;
}

export function getHalloweenCollisionSizes(listings, zoom, selectedId) {
  const sizes = {};
  listings.forEach((listing) => {
    if (listing?.listingType !== "halloween_candy" && listing?.type !== "halloween_candy") return;
    // Nearby markers must not shrink Halloween icons below their active size.
    sizes[listing.id] = getHalloweenSpotMapSize(listing, listing.id === selectedId, new Date(), zoom);
  });
  return sizes;
}