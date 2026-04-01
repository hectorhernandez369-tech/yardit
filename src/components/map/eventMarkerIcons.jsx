import L from "leaflet";
import { getEventIconEmoji } from "@/lib/eventListingConfig";
import { MARQUEE_BOARD_WIDTH, MARQUEE_BOARD_COLLAPSED_WIDTH } from "@/components/map/MarqueeBoard.jsx";

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

export function getCollapsedMarqueeScale(zoom) {
  if (zoom >= 13) return 1.0;
  if (zoom === 12) return 0.85;
  return 0.70;
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
      const scale = isCollapsed ? getCollapsedMarqueeScale(zoom) : 1.0;
      const scaledHtml = (scale !== 1.0 && isCollapsed)
        ? marqueeHtml.replace(
            'position:absolute;bottom:',
            `transform:scale(${scale});transform-origin:bottom center;position:absolute;bottom:`
          )
        : marqueeHtml;
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

    // ── CLOSED-STATE: Theater Marquee Circle (matches reference image) ────────
    // Layers: dark chrome outer ring → thick red band → warm bulbs on red → cream center panel
    const styleId = "mqring-v4";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes mq-on {
          0%,100% { opacity:1;   box-shadow:0 0 4px 1px rgba(255,230,100,0.9); }
          50%      { opacity:0.28;box-shadow:none; }
        }
        @keyframes mq-off {
          0%,100% { opacity:0.28;box-shadow:none; }
          50%      { opacity:1;   box-shadow:0 0 4px 1px rgba(255,230,100,0.9); }
        }
        .mq-a { animation: mq-on  1.1s ease-in-out infinite; }
        .mq-b { animation: mq-off 1.1s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    const size = 40;
    const CX = 20, CY = 20;
    // Bulbs sit right on the inner edge of the red ring
    const R = 14.5;
    const bulbD = 5;      // larger bulbs like the reference
    const count = 16;     // more bulbs, dense like the reference

    const bulbsHtml = Array.from({ length: count }, (_, i) => {
      const rad = (2 * Math.PI * i) / count;
      const x = (CX + R * Math.sin(rad) - bulbD / 2).toFixed(2);
      const y = (CY - R * Math.cos(rad) - bulbD / 2).toFixed(2);
      const cls = i % 2 === 0 ? "mq-a" : "mq-b";
      // warm white-gold bulb, slightly convex highlight at top-left
      return `<div class="${cls}" style="position:absolute;left:${x}px;top:${y}px;width:${bulbD}px;height:${bulbD}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFFFF0,#FFE566 45%,#FFA500);flex-shrink:0;z-index:3;"></div>`;
    }).join("");

    // marker: outer dark chrome → red ring → cream rounded-rect center → bulbs on top
    const html = `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <!-- dark outer chrome border -->
        <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 38% 30%,#6b4c1e,#2a1a00 60%,#0d0800);box-shadow:0 3px 8px rgba(0,0,0,0.7),0 0 6px rgba(255,180,30,0.25);"></div>
        <!-- thick deep-red ring -->
        <div style="position:absolute;inset:2.5px;border-radius:50%;background:radial-gradient(circle at 42% 36%,#d63030,#9b0e0e 55%,#600000);"></div>
        <!-- cream/white center panel (rounded rect, not circle — matches reference) -->
        <div style="position:absolute;inset:9px;border-radius:5px;background:linear-gradient(180deg,#fffef5 0%,#f7efcc 100%);box-shadow:inset 0 1px 4px rgba(0,0,0,0.18);"></div>
        <!-- bulbs rendered on top of red ring -->
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