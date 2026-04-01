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

    // Closed marquee: Hollywood spotlight animation (CSS keyframes injected once)
    const styleId = "marquee-spotlight-style";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes mq-left {
          0%, 100% { transform: translateX(-50%) rotate(-14deg); }
          50%       { transform: translateX(-50%) rotate(-5deg);  }
        }
        @keyframes mq-right {
          0%, 100% { transform: translateX(-50%) rotate(14deg); }
          50%       { transform: translateX(-50%) rotate(5deg);  }
        }
        .mq-bl { animation: mq-left  2s ease-in-out infinite; }
        .mq-br { animation: mq-right 2s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    const size = 48;
    // Both beams are positioned with left:50% so they originate from the horizontal center.
    // transform: translateX(-50%) keeps them centered, then rotate() swings them left/right.
    // transform-origin is bottom center (default for this layout), pivoting from the base.
    const html = `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <!-- left beam -->
        <div class="mq-bl" style="position:absolute;bottom:12px;left:50%;width:12px;height:28px;transform-origin:bottom center;filter:drop-shadow(0 0 1px rgba(255,213,79,0.9));">
          <div style="width:100%;height:100%;background:linear-gradient(to top,rgba(255,213,79,1) 0%,rgba(255,236,150,0.7) 55%,rgba(255,255,220,0.0) 100%);clip-path:polygon(50% 100%,0% 0%,100% 0%);"></div>
        </div>
        <!-- right beam -->
        <div class="mq-br" style="position:absolute;bottom:12px;left:50%;width:12px;height:28px;transform-origin:bottom center;filter:drop-shadow(0 0 1px rgba(255,213,79,0.9));">
          <div style="width:100%;height:100%;background:linear-gradient(to top,rgba(255,213,79,1) 0%,rgba(255,236,150,0.7) 55%,rgba(255,255,220,0.0) 100%);clip-path:polygon(50% 100%,0% 0%,100% 0%);"></div>
        </div>
        <!-- base circle -->
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);z-index:2;width:22px;height:22px;border-radius:9999px;background:radial-gradient(circle at 40% 35%,#5c4200,#2a1e00);border:2px solid #f4a849;box-shadow:0 0 8px rgba(255,213,79,0.55),0 2px 6px rgba(0,0,0,0.45);"></div>
      </div>`;

    return makeDivIcon(`event_marquee_closed_${listing?.id}_${isSelected}`, html, size, size, size / 2, size);
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