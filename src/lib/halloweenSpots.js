export const HALLOWEEN_DEFAULT_ACTIVATION_TIME = "15:00";

export const HALLOWEEN_SPOT_TYPE_LABELS = {
  halloween_decorations: "Halloween Decorations",
  haunted: "Haunted House",
  trick_or_treat: "Trick-or-Treat",
  trunk_or_treat: "Trunk-or-Treat",
  scary_yard: "Scary Yard",
  light_show: "Light Show",
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

function localYmd(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getHalloweenSpotType(listing) {
  const candidate = listing?.halloween_spot_type || listing?.halloween_icon_key || listing?.icon_key || "halloween_decorations";
  return HALLOWEEN_SPOT_TYPE_LABELS[candidate] ? candidate : "halloween_decorations";
}

export function getHalloweenSpotTypeLabel(listing) {
  return HALLOWEEN_SPOT_TYPE_LABELS[getHalloweenSpotType(listing)] || "Halloween Spot";
}

export function isHalloweenTeaser(listing, now = new Date()) {
  if (!listing?.teaser_until && !listing?.halloweenTeaser) return false;
  const teaserUntil = listing?.teaser_until ? new Date(listing.teaser_until) : null;
  return !teaserUntil || Number.isNaN(teaserUntil.getTime()) || now <= teaserUntil;
}

export function isHalloweenSpotVisible(listing, now = new Date()) {
  if (!isHalloweenSpot(listing)) return false;
  if (listing?.status && listing.status !== "active") return false;
  if (isHalloweenTeaser(listing, now)) return true;

  const today = localYmd(now);
  const startDate = listing?.halloween_start_date || (listing?.startDateTime ? String(listing.startDateTime).slice(0, 10) : "");
  const endDate = listing?.halloween_end_date || (listing?.endDateTime ? String(listing.endDateTime).slice(0, 10) : "");

  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;
  return true;
}

export function isHalloweenFullIconActive(listing, now = new Date()) {
  if (!isHalloweenSpotVisible(listing, now)) return false;
  const requested = listing?.halloween_activation_time || listing?.full_icon_activation_time || listing?.halloween_start_time || listing?.viewing_start_time || HALLOWEEN_DEFAULT_ACTIVATION_TIME;
  const safeActivationMinutes = Math.max(minutesFromTimeString(requested), minutesFromTimeString(HALLOWEEN_DEFAULT_ACTIVATION_TIME));
  const endTime = listing?.halloween_end_time || listing?.viewing_end_time || "";
  const endMinutes = endTime ? minutesFromTimeString(endTime, endTime) : null;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes < safeActivationMinutes) return false;
  if (Number.isFinite(endMinutes) && currentMinutes > endMinutes) return false;
  return true;
}
