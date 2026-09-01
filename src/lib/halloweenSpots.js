export const HALLOWEEN_DEFAULT_ACTIVATION_TIME = "15:00";

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