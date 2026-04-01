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

    // ── CLOSED-STATE: Theater Marquee Ring ───────────────────────────────────
    // Resembles: deep red ring + warm gold bulbs around inner edge + light center
    const styleId = "marquee-theater-ring-v1";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes mqt-on {
          0%,100% { opacity:1;   filter:drop-shadow(0 0 3px rgba(255,220,80,1)); }
          50%      { opacity:0.3; filter:drop-shadow(0 0 0   rgba(255,220,80,0)); }
        }
        @keyframes mqt-off {
          0%,100% { opacity:0.3; filter:drop-shadow(0 0 0   rgba(255,220,80,0)); }
          50%      { opacity:1;   filter:drop-shadow(0 0 3px rgba(255,220,80,1)); }
        }
        .mqt-a { animation: mqt-on  2.2s ease-in-out infinite; }
        .mqt-b { animation: mqt-off 2.2s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    const size = 40;
    const CX = 20, CY = 20;
    // Bulbs sit on the inner edge of the red ring, at radius ~15px from center
    const R = 15;
    const bulbD = 4;
    const count = 14;

    const bulbsHtml = Array.from({ length: count }, (_, i) => {
      const rad = (2 * Math.PI * i) / count;
      const x = (CX + R * Math.sin(rad) - bulbD / 2).toFixed(2);
      const y = (CY - R * Math.cos(rad) - bulbD / 2).toFixed(2);
      const cls = i % 2 === 0 ? "mqt-a" : "mqt-b";
      return `<div class="${cls}" style="position:absolute;left:${x}px;top:${y}px;width:${bulbD}px;height:${bulbD}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFFDE7,#FFE033 50%,#FF9800);flex-shrink:0;"></div>`;
    }).join("");

    // Outer gold chrome ring → deep red band → inner light panel center
    const html = `<div style="position:relative;width:${size}px;height:${size}px;background:transparent;">
      <!-- outer chrome/gold ring -->
      <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 38% 32%,#c8a04a,#7a5a18 55%,#3d2900);box-shadow:0 2px 6px rgba(0,0,0,0.55),0 0 8px rgba(255,200,60,0.3);"></div>
      <!-- red ring band -->
      <div style="position:absolute;inset:3px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#c0392b,#8b1a1a 60%,#5c0e0e);"></div>
      <!-- inner light center panel -->
      <div style="position:absolute;inset:9px;border-radius:50%;background:radial-gradient(circle at 45% 40%,#fff9e6,#f5e8c0 60%,#e8d49a);box-shadow:inset 0 1px 3px rgba(0,0,0,0.15);"></div>
      <!-- bulbs on top of red ring -->
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