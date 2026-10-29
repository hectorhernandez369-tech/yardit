import { specialtyRectsOverlap } from "./specialtyMarqueeCollision.js";

// Every size is ONE clickable marquee anchored at the event's real coordinates.
// No floating companion marker and no left/right repositioning.
export const YARDITS_UNIFIED_SIZES = Object.freeze({
  full: Object.freeze({ width: 170, height: 130, anchorX: 85, anchorY: 128 }),
  compact: Object.freeze({ width: 126, height: 83, anchorX: 63, anchorY: 81 }),
  mini: Object.freeze({ width: 84, height: 52, anchorX: 42, anchorY: 50 }),
});

const EDGE_MARGIN = 5;
const CLEARANCE = 10;
const EXPANSION_CLEARANCE = 18;
const MODES = ["full", "compact", "mini"];

export function yarditsUnifiedBounds(point, mode) {
  const size = YARDITS_UNIFIED_SIZES[mode];
  if (!size || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  const left = point.x - size.anchorX;
  const top = point.y - size.anchorY;
  return { left, top, right: left + size.width, bottom: top + size.height };
}

export function chooseYarditsUnifiedMode(point, obstacles, viewport, zoom, previousMode = "") {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y) ||
      !Number.isFinite(viewport?.width) || !Number.isFinite(viewport?.height) ||
      !Number.isFinite(zoom)) return "hidden";

  // At far zoom, a billboard spans enormous geographic distances; use
  // a tiny billboard at the exact event location instead.
  const options = zoom >= 16 ? MODES :
    zoom >= 13 ? ["compact", "mini"] : ["mini"];
  const previousRank = MODES.indexOf(previousMode);

  for (const mode of options) {
    const rect = yarditsUnifiedBounds(point, mode);
    if (rect.left < EDGE_MARGIN || rect.top < EDGE_MARGIN ||
        rect.right > viewport.width - EDGE_MARGIN ||
        rect.bottom > viewport.height - EDGE_MARGIN) continue;

    const growing = previousRank !== -1 && MODES.indexOf(mode) < previousRank;
    const gap = growing ? EXPANSION_CLEARANCE : CLEARANCE;
    if (!(obstacles || []).some((obstacle) => specialtyRectsOverlap(rect, obstacle, gap))) {
      return mode;
    }
  }
  // If even the mini sign conflicts, preserve the other map pins and clusters.
  return "hidden";
}
