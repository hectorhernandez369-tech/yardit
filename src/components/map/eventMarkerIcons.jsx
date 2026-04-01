import L from "leaflet";
import { getEventIconEmoji } from "@/lib/eventListingConfig";
import { MARQUEE_BOARD_WIDTH, MARQUEE_BOARD_COLLAPSED_WIDTH } from "@/components/map/MarqueeBoard.jsx";

// iconAnchor Y=0: wrapper is 0-height, tail tip = coordinate
const MARQUEE_ANCHOR_Y = 0;

const cache = {};

function makeDivIcon(key, html, width, height, anchorX = width / 2, anchorY = height) {
  if (!cache[key]) {
    cache[key] = L.divIcon({
      className: "event-marker",
      html,
      iconSize: [width, height],
      iconAnchor: [anchorX, anchorY],
      popupAnchor: [0, -height + 4],
    });
  }
  return cache[key];
}

// Returns a scale factor (0..1) for collapsed marquee based on zoom level.
// zoom 13+ = 1.0, zoom 12 = 0.85, zoom 11 = 0.70, below 11 = 0.70 (clustering takes over anyway)
export function getCollapsedMarqueeScale(zoom) {
  if (zoom >= 13) return 1.0;
  if (zoom === 12) return 0.85;
  return 0.70; // zoom 11 and below
}

export function getEventMarkerIcon(listing, isSelected = false, marqueeOpen = false, marqueeHtml = "", zoom = 13) {
  const tier = listing?.event_tier || listing?.tier || "basic";
  const emoji = getEventIconEmoji(listing?.event_icon);
  const image = listing?.event_logo_url || listing?.event_photos?.[0] || listing?.photoUrls?.[0];

  if (tier === "marquee") {
    if (marqueeOpen && marqueeHtml) {
      const isCollapsed = marqueeHtml.includes(`width:${MARQUEE_BOARD_COLLAPSED_WIDTH}px`);
      const boardWidth = isCollapsed ? MARQUEE_BOARD_COLLAPSED_WIDTH : MARQUEE_BOARD_WIDTH;
      const half = Math.round(boardWidth / 2);

      // Apply zoom-based scale ONLY to collapsed marquee.
      // We scale the inner card div (position:absolute;bottom:...) using transform-origin:bottom center
      // so it shrinks upward from the tail tip, keeping the anchor stable.
      const scale = isCollapsed ? getCollapsedMarqueeScale(zoom) : 1.0;
      const scaledHtml = (scale !== 1.0 && isCollapsed)
        ? marqueeHtml.replace(
            'position:absolute;bottom:',
            `transform:scale(${scale});transform-origin:bottom center;position:absolute;bottom:`
          )
        : marqueeHtml;

      // Cache key includes zoom (for collapsed) and content hash
      const cacheKey = `event_marquee_board_${listing?.id}_${boardWidth}_z${isCollapsed ? zoom : 0}_${marqueeHtml.slice(-48)}`;
      if (!cache[cacheKey]) {
        cache[cacheKey] = L.divIcon({
          className: "event-marker",
          html: scaledHtml,
          iconSize: [boardWidth, 0],
          iconAnchor: [half, MARQUEE_ANCHOR_Y],
          popupAnchor: [0, 4],
        });
      }
      return cache[cacheKey];
    }

    // ── CLOSED-STATE MARQUEE MARKER ──────────────────────────────────────────
    // 40×40 "Marquee Bulb Ring": dark center, 8 warm-gold bulbs, alternating glow.
    const styleId = "marquee-bulb-ring-style";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes mqb-bright {
          0%,100% { opacity:1;   filter:drop-shadow(0 0 3px rgba(255,213,74,0.95)); }
          50%      { opacity:0.4; filter:drop-shadow(0 0 1px rgba(255,213,74,0.3));  }
        }
        @keyframes mqb-dim {
          0%,100% { opacity:0.4; filter:drop-shadow(0 0 1px rgba(255,213,74,0.3));  }
          50%      { opacity:1;   filter:drop-shadow(0 0 3px rgba(255,213,74,0.95)); }
        }
        .mqb-a { animation: mqb-bright 1.6s ease-in-out infinite; }
        .mqb-b { animation: mqb-dim    1.6s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    // 8 bulbs evenly spaced around a 17px radius circle (fits in 40px container)
    const R = 17; // radius from center to bulb center
    const CX = 20; // center x
    const CY = 20; // center y
    const bulbSize = 5;
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const bulbsHtml = angles.map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const x = CX + R * Math.sin(rad) - bulbSize / 2;
      const y = CY - R * Math.cos(rad) - bulbSize / 2;
      const cls = i % 2 === 0 ? "mqb-a" : "mqb-b";
      return `<div class="${cls}" style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${bulbSize}px;height:${bulbSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFF4A3,#FFD54A 55%,#FFB300);"></div>`;
    }).join("");

    const size = 40;
    const html = `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <!-- outer glow ring -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size}px;height:${size}px;border-radius:50%;box-shadow:0 0 10px 3px rgba(255,213,74,0.35);pointer-events:none;"></div>
        <!-- dark center -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#3d2a00,#1a1000);border:1.5px solid rgba(244,168,73,0.6);"></div>
        <!-- bulbs -->
        ${bulbsHtml}
      </div>`;

    return makeDivIcon(`event_marquee_closed_${listing?.id}_${isSelected}`, html, size, size, size / 2, size / 2);
  }

  if (tier === "premium") {
    const size = isSelected ? 48 : 42;
    const html = image
      ? `<div style="width:${size}px;height:${size}px;border-radius:9999px;overflow:hidden;border:3px solid #F4A849;background:#fff;box-shadow:0 8px 16px rgba(0,0,0,0.3);"><img src="${image}" alt="Event" style="width:100%;height:100%;object-fit:cover;" /></div>`
      : `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:3px solid #F4A849;background:#2C4F4E;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 16px rgba(0,0,0,0.3);">${emoji}</div>`;
    return makeDivIcon(`event_premium_${image || emoji}_${isSelected}`, html, size, size, size / 2, size);
  }

  if (tier === "featured") {
    const size = isSelected ? 38 : 34;
    const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:3px solid #2C4F4E;background:#5DADA5;color:white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 14px rgba(0,0,0,0.28);">${emoji}</div>`;
    return makeDivIcon(`event_featured_${emoji}_${isSelected}`, html, size, size, size / 2, size);
  }

  const size = isSelected ? 32 : 28;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:2px solid #111827;background:white;color:#111827;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 10px rgba(0,0,0,0.22);">${emoji}</div>`;
  return makeDivIcon(`event_basic_${emoji}_${isSelected}`, html, size, size, size / 2, size);
}