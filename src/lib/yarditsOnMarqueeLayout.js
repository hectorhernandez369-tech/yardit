import { SPECIALTY_MARQUEE_SIZES, specialtyRectsOverlap } from "./specialtyMarqueeCollision";

// The event remains at its true location. Each anchor only repositions decorative
// artwork around that location, rather than moving the underlying event pin.
export const YARDITS_ON_LAYOUTS = Object.freeze([
  { key: "full-above", mode: "full", placement: "above", anchorX: 82, anchorY: 200 },
  { key: "compact-above", mode: "compact", placement: "above", anchorX: 58, anchorY: 120 },
  { key: "compact-right", mode: "compact", placement: "right", anchorX: -46, anchorY: 36 },
  { key: "compact-left", mode: "compact", placement: "left", anchorX: 162, anchorY: 36 },
  { key: "compact-below", mode: "compact", placement: "below", anchorX: 58, anchorY: -46 },
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

export function chooseYarditsOnLayout(point, obstacles, viewport, previousKey = "") {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      !Number.isFinite(viewport?.width) || !Number.isFinite(viewport?.height)) {
    return { key: "hidden", mode: "hidden", rect: null };
  }

  const previousIndex = YARDITS_ON_LAYOUTS.findIndex((layout) => layout.key === previousKey);
  for (let i = 0; i < YARDITS_ON_LAYOUTS.length; i += 1) {
    const layout = YARDITS_ON_LAYOUTS[i];
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
