// Pure screen-space geometry. A marquee is decorative; real pins and clusters win.
export const SPECIALTY_MARQUEE_SIZES = Object.freeze({
  // The sign sits 42px above its actual location, leaving the regular event pin usable.
  full: Object.freeze({ width: 164, height: 152, anchorX: 82, anchorY: 194, popupY: -188 }),
  compact: Object.freeze({ width: 116, height: 72, anchorX: 58, anchorY: 114, popupY: -112 }),
  marker: Object.freeze({ width: 38, height: 42, anchorX: 19, anchorY: 84, popupY: -82 }),
});

const TIERS = ["full", "compact", "marker"];
const PIN_CLEARANCE = 12; // px between any marquee and the real rendered pin/cluster
const EXPANSION_CLEARANCE = 20; // extra space needed to grow, avoiding resize flicker
const EDGE_CLEARANCE = 6;

export function getSpecialtyScreenBounds(point, mode) {
  const size = SPECIALTY_MARQUEE_SIZES[mode];
  if (!size) return null;
  return {
    left: point.x - size.anchorX,
    top: point.y - size.anchorY,
    right: point.x - size.anchorX + size.width,
    bottom: point.y - size.anchorY + size.height,
  };
}

export function specialtyRectsOverlap(a, b, gap = 0) {
  if (!a || !b) return false;
  return a.left < b.right + gap &&
    a.right > b.left - gap &&
    a.top < b.bottom + gap &&
    a.bottom > b.top - gap;
}

// The location never changes: only the artwork around the anchored pin changes.
// In an impossibly crowded area, hide the artwork and leave the standard event pin.
export function chooseSpecialtyMarqueeMode(point, obstacles, viewport, previousMode = "") {
  const previousRank = previousMode === "hidden" ? TIERS.length : TIERS.indexOf(previousMode);
  for (let rank = 0; rank < TIERS.length; rank += 1) {
    const mode = TIERS[rank];
    const rect = getSpecialtyScreenBounds(point, mode);
    if (!rect || rect.left < EDGE_CLEARANCE || rect.top < EDGE_CLEARANCE ||
        rect.right > viewport.width - EDGE_CLEARANCE ||
        rect.bottom > viewport.height - EDGE_CLEARANCE) continue;
    const gap = previousRank >= 0 && rank < previousRank ? EXPANSION_CLEARANCE : PIN_CLEARANCE;
    if (obstacles.some((obstacle) => specialtyRectsOverlap(rect, obstacle, gap))) continue;
    return { mode, rect };
  }
  return { mode: "hidden", rect: null };
}
