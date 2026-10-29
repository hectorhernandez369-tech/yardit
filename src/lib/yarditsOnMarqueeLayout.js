import { SPECIALTY_MARQUEE_SIZES, specialtyRectsOverlap } from "./specialtyMarqueeCollision";

// The event remains at its true location. Each anchor only repositions decorative
// artwork around that location, rather than moving the underlying event pin.
// Large artwork must stay centered above its actual pin. Moving it to the
// left/right/below can make it look miles away at wider map zoom levels.
export const YARDITS_ON_MIN_COMPACT_ZOOM = 15;
export const YARDITS_ON_MIN_FULL_ZOOM = 16;
export const YARDITS_ON_LAYOUTS = Object.freeze([
  { key: "full-above", mode: "full", placement: "above", anchorX: 82, anchorY: 200 },
  { key: "compact-above", mode: "compact", placement: "above", anchorX: 58, anchorY: 120 },
]);

const MIN_GAP = 12;
const GROW_GAP = 20;
const EDGE_GAP = 6;

export function getYarditsOnBounds(point, layout) {
  if (!layout || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const size = SPECIALTY_MARQUEE_SIZES[layout.mode];
  if (!size) return null;
  const left = point.x - layout.anchorX;
  const top = point.y - layout.anchorY;
  return { left, top, right: left + size.width, bottom: top + size.height };
}

export function chooseYarditsOnLayout(point, obstacles, viewport, previousKey = "", zoom = 18) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      !Number.isFinite(viewport?.width) || !Number.isFinite(viewport?.height) ||
      !Number.isFinite(zoom) || zoom < YARDITS_ON_MIN_COMPACT_ZOOM) {
    // The branded, clickable event pin still renders on the map at every zoom.
    return { key: "hidden", mode: "hidden", rect: null };
  }

  const previousIndex = YARDITS_ON_LAYOUTS.findIndex((layout) => layout.key === previousKey);
  for (let i = 0; i < YARDITS_ON_LAYOUTS.length; i += 1) {
    const layout = YARDITS_ON_LAYOUTS[i];
    // At neighborhood zoom, use only the small sign; the tall spotlight
    // would visually reach into a different geographic area.
    if (layout.mode === "full" && zoom < YARDITS_ON_MIN_FULL_ZOOM) continue;
    const rect = getYarditsOnBounds(point, layout);
    if (!rect || rect.left < EDGE_GAP || rect.top < EDGE_GAP ||
        rect.right > viewport.width - EDGE_GAP ||
        rect.bottom > viewport.height - EDGE_GAP) continue;

    // Requires more breathing room to grow than to stay at the current size.
    const gap = previousIndex >= 0 && i < previousIndex ? GROW_GAP : MIN_GAP;
    if ((obstacles || []).some((obstacle) => specialtyRectsOverlap(rect, obstacle, gap))) continue;
    return { ...layout, rect };
  }
  return { key: "hidden", mode: "hidden", rect: null };
}
