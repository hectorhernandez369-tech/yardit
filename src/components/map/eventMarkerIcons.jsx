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

    // ── CLOSED-STATE: Mini Marquee Pill (matches collapsed/expanded design system) ──
    // Colors match MarqueeBoard exactly: bg #7c2d12→#3f1d0b, border #f4a849, bulbs #FFF4A3→#FFD54A→#FFB300
    const styleId = "mqpill-v2";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes mqp2-on  { 0%,100%{opacity:1;  } 50%{opacity:0.25;} }
        @keyframes mqp2-off { 0%,100%{opacity:0.25;} 50%{opacity:1;  } }
        .mqp2-a { animation: mqp2-on  2.2s ease-in-out infinite; }
        .mqp2-b { animation: mqp2-off 2.2s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    // Dimensions: ~46px wide, 24px tall — matches proportions of collapsed card
    const W = 46, H = 24;
    // Bulb spec: exactly matches MarqueeBoard bulb style (5px, same gradient + glow)
    const bulbD = 5;
    const bulbOff = -2.5; // centers 5px bulb on border edge, same as MarqueeBoard
    const bulbStyle = `position:absolute;width:${bulbD}px;height:${bulbD}px;border-radius:50%;background:radial-gradient(circle at 38% 38%,#FFF4A3,#FFD54A 50%,#FFB300);box-shadow:0 0 4px rgba(255,213,74,0.8);z-index:3;`;

    // Evenly space bulbs on top & bottom edges (matching MarqueeBoard sp=16, inset=8)
    const topBulbs = [];
    const botBulbs = [];
    const inset = 6, sp = 11; // tighter spacing for small pill width
    for (let x = inset; x <= W - inset - bulbD; x += sp) {
      const cls = topBulbs.length % 2 === 0 ? "mqp2-a" : "mqp2-b";
      topBulbs.push(`<div class="${cls}" style="${bulbStyle}left:${x}px;top:${bulbOff}px;"></div>`);
      botBulbs.push(`<div class="${cls}" style="${bulbStyle}left:${x}px;bottom:${bulbOff}px;"></div>`);
    }

    const html = `
      <div style="position:relative;width:${W}px;height:${H}px;overflow:visible;">
        <!-- card body: exact same colors as collapsed marquee board -->
        <div style="position:absolute;inset:0;border-radius:6px;border:1px solid #f4a849;background:linear-gradient(to bottom,#7c2d12,#3f1d0b);box-shadow:0 3px 8px rgba(0,0,0,0.35);overflow:visible;box-sizing:border-box;">
          <!-- icon centered, white for legibility on dark bg -->
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;">${emoji}</div>
        </div>
        ${topBulbs.join("")}
        ${botBulbs.join("")}
      </div>`;

    return makeDivIcon(`event_marquee_closed_${listing?.id}_${isSelected}`, html, W, H, W / 2, H / 2);
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