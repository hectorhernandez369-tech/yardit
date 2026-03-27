import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import { MARQUEE_BOARD_WIDTH, MARQUEE_BOARD_COLLAPSED_WIDTH } from "@/components/map/MarqueeBoard.jsx";

const EDGE_OFFSET = 12; // px outward from marquee edge
const PIN_SPACING = 8;  // px between pins on same edge
const MAX_PINS_PER_MARQUEE = 5;
const CARD_HEIGHT = 52; // collapsed card height

const PULSE_GLOW_CSS = `
@keyframes marqueeBoostPulse {
  0%   { box-shadow: 0 0 6px rgba(255, 214, 10, 0.5); }
  50%  { box-shadow: 0 0 12px rgba(255, 214, 10, 0.9); }
  100% { box-shadow: 0 0 6px rgba(255, 214, 10, 0.5); }
}
`;

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  const el = document.createElement("style");
  el.textContent = PULSE_GLOW_CSS;
  document.head.appendChild(el);
  styleInjected = true;
}

/**
 * Given the marquee listing and map, return the screen bounding box of the card.
 * The marquee iconAnchor is [half, 0] so the tail tip = lat/lng pixel.
 * The card sits ABOVE the tail tip.
 */
function getMarqueeBoundingBox(marqueeListing, map, isExpanded) {
  const { lat, lng } = marqueeListing;
  if (lat == null || lng == null) return null;

  const point = map.latLngToContainerPoint([lat, lng]);
  const boardWidth = isExpanded ? MARQUEE_BOARD_WIDTH : MARQUEE_BOARD_COLLAPSED_WIDTH;
  const cardH = isExpanded ? 120 : CARD_HEIGHT; // approx expanded height
  const half = Math.round(boardWidth / 2);
  const tailH = 6;

  return {
    left:   point.x - half,
    right:  point.x + half,
    top:    point.y - cardH - tailH,
    bottom: point.y,          // tail tip = coordinate
  };
}

/**
 * For each covered pin, determine nearest edge and compute offset position.
 * Returns array of { listing, edge, screenPos, offsetPos }
 */
function computeOffsets(coveredPins, bbox) {
  const edges = { left: [], right: [], top: [], bottom: [] };

  for (const { listing, screenPos } of coveredPins) {
    const distLeft   = Math.abs(screenPos.x - bbox.left);
    const distRight  = Math.abs(screenPos.x - bbox.right);
    const distTop    = Math.abs(screenPos.y - bbox.top);
    const distBottom = Math.abs(screenPos.y - bbox.bottom);

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    if      (minDist === distLeft)   edges.left.push({ listing, screenPos });
    else if (minDist === distRight)  edges.right.push({ listing, screenPos });
    else if (minDist === distTop)    edges.top.push({ listing, screenPos });
    else                              edges.bottom.push({ listing, screenPos });
  }

  const result = [];

  // Left edge: distribute vertically
  edges.left.forEach(({ listing, screenPos }, i) => {
    const count = edges.left.length;
    const centerY = (bbox.top + bbox.bottom) / 2;
    const totalH = (count - 1) * (28 + PIN_SPACING);
    const startY = centerY - totalH / 2;
    result.push({
      listing,
      screenPos,
      offsetPos: { x: bbox.left - EDGE_OFFSET, y: startY + i * (28 + PIN_SPACING) },
    });
  });

  // Right edge: distribute vertically
  edges.right.forEach(({ listing, screenPos }, i) => {
    const count = edges.right.length;
    const centerY = (bbox.top + bbox.bottom) / 2;
    const totalH = (count - 1) * (28 + PIN_SPACING);
    const startY = centerY - totalH / 2;
    result.push({
      listing,
      screenPos,
      offsetPos: { x: bbox.right + EDGE_OFFSET, y: startY + i * (28 + PIN_SPACING) },
    });
  });

  // Top edge: distribute horizontally
  edges.top.forEach(({ listing, screenPos }, i) => {
    const count = edges.top.length;
    const centerX = (bbox.left + bbox.right) / 2;
    const totalW = (count - 1) * (28 + PIN_SPACING);
    const startX = centerX - totalW / 2;
    result.push({
      listing,
      screenPos,
      offsetPos: { x: startX + i * (28 + PIN_SPACING), y: bbox.top - EDGE_OFFSET },
    });
  });

  // Bottom edge: distribute horizontally
  edges.bottom.forEach(({ listing, screenPos }, i) => {
    const count = edges.bottom.length;
    const centerX = (bbox.left + bbox.right) / 2;
    const totalW = (count - 1) * (28 + PIN_SPACING);
    const startX = centerX - totalW / 2;
    result.push({
      listing,
      screenPos,
      offsetPos: { x: startX + i * (28 + PIN_SPACING), y: bbox.bottom + EDGE_OFFSET },
    });
  });

  return result;
}

function getGlowStyle(tier) {
  if (tier === "premium") {
    return "animation:marqueeBoostPulse 1.8s ease-in-out infinite;";
  }
  if (tier === "featured") {
    return "box-shadow:0 0 6px rgba(45,173,165,0.4);";
  }
  return "";
}

/**
 * MarqueeBoostEffect
 *
 * Props:
 *   marqueeListings  – array of currently-open marquee listings (with lat/lng)
 *   openMarqueeIds   – { [id]: "collapsed"|"expanded"|false|undefined }
 *   visiblePins      – all pins currently rendered on map
 *   markerRefsMap    – ref map of listing.id → Leaflet marker instance
 *   currentZoom      – current map zoom
 */
export default function MarqueeBoostEffect({
  marqueeListings,
  openMarqueeIds,
  visiblePins,
  markerRefsMap,
  currentZoom,
}) {
  const map = useMap();
  const appliedRef = useRef(new Map()); // listingId → { el, origTransform }

  injectStyle();

  const clearAll = useCallback(() => {
    appliedRef.current.forEach(({ el, origTransform }) => {
      if (!el) return;
      el.style.transform = origTransform;
      el.style.animation = "";
      el.style.boxShadow = "";
      el.style.zIndex = "";
      el.style.transition = "";
    });
    appliedRef.current.clear();
  }, []);

  const applyBoost = useCallback(() => {
    // First, restore all previously boosted pins
    appliedRef.current.forEach(({ el, origTransform }) => {
      if (!el) return;
      el.style.transform = origTransform;
      el.style.animation = "";
      el.style.boxShadow = "";
      el.style.zIndex = "";
      el.style.transition = "";
    });
    appliedRef.current.clear();

    if (!marqueeListings || marqueeListings.length === 0) return;

    marqueeListings.forEach((marqueeListing) => {
      const marqueeState = openMarqueeIds[marqueeListing.id];
      if (!marqueeState || marqueeState === false) return;

      const isExpanded = marqueeState === "expanded";
      const bbox = getMarqueeBoundingBox(marqueeListing, map, isExpanded);
      if (!bbox) return;

      // Find pins that are visually inside the marquee bounding box
      const coveredPins = [];
      for (const listing of visiblePins) {
        if (listing.id === marqueeListing.id) continue;
        const markerRef = markerRefsMap.current[listing.id];
        if (!markerRef) continue;

        const screenPos = map.latLngToContainerPoint([listing.lat, listing.lng]);
        const inside =
          screenPos.x > bbox.left &&
          screenPos.x < bbox.right &&
          screenPos.y > bbox.top &&
          screenPos.y < bbox.bottom;

        if (inside) {
          coveredPins.push({ listing, screenPos });
          if (coveredPins.length >= MAX_PINS_PER_MARQUEE) break;
        }
      }

      if (coveredPins.length === 0) return;

      const offsets = computeOffsets(coveredPins, bbox);

      offsets.forEach(({ listing, screenPos, offsetPos }) => {
        const markerRef = markerRefsMap.current[listing.id];
        if (!markerRef) return;

        const el = markerRef.getElement?.();
        if (!el) return;

        const innerEl = el.querySelector("div") || el;
        const dx = offsetPos.x - screenPos.x;
        const dy = offsetPos.y - screenPos.y;

        const origTransform = el.style.transform || "";

        el.style.transition = "transform 0.25s ease";
        el.style.transform = `${origTransform} translate(${dx}px, ${dy}px)`;
        el.style.zIndex = "900";

        const tier = listing.event_tier || listing.tier || "basic";
        const glowStyle = getGlowStyle(tier);
        if (glowStyle.includes("animation")) {
          innerEl.style.animation = "marqueeBoostPulse 1.8s ease-in-out infinite";
        } else if (glowStyle.includes("box-shadow")) {
          innerEl.style.boxShadow = "0 0 6px rgba(45,173,165,0.4)";
        }

        appliedRef.current.set(listing.id, { el, innerEl, origTransform });
      });
    });
  }, [map, marqueeListings, openMarqueeIds, visiblePins, markerRefsMap]);

  // Re-run on every relevant change
  useEffect(() => {
    // Small defer so Leaflet has positioned markers before we read their screen coords
    const timer = setTimeout(applyBoost, 80);
    return () => clearTimeout(timer);
  }, [applyBoost, currentZoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAll();
  }, [clearAll]);

  return null;
}