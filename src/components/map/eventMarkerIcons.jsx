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

    // ── CLOSED-STATE: Mini Marquee Pill ──────────────────────────────────────
    const styleId = "mqpill-v1";
    if (typeof document !== "undefined" && !document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes mqp-on  { 0%,100%{opacity:1;  } 50%{opacity:0.2;} }
        @keyframes mqp-off { 0%,100%{opacity:0.2;} 50%{opacity:1;  } }
        .mqp-a { animation: mqp-on  2.6s ease-in-out infinite; }
        .mqp-b { animation: mqp-off 2.6s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    const W = 46, H = 22;
    const bulbD = 3;
    const pad = 5;          // left/right inset before first bulb
    const gap = 7;          // spacing between bulbs
    const bulbY_top = -1.5; // centered on top edge
    const bulbY_bot = H - bulbD + 1.5;

    // generate top + bottom bulbs
    const topBulbs = [];
    const botBulbs = [];
    for (let x = pad; x <= W - pad - bulbD; x += gap) {
      const cls = topBulbs.length % 2 === 0 ? "mqp-a" : "mqp-b";
      const bulbStyle = `position:absolute;width:${bulbD}px;height:${bulbD}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFFDE7,#FFD740 55%,#CC8800);z-index:3;`;
      topBulbs.push(`<div class="${cls}" style="${bulbStyle}left:${x}px;top:${bulbY_top.toFixed(1)}px;"></div>`);
      botBulbs.push(`<div class="${cls}" style="${bulbStyle}left:${x}px;top:${bulbY_bot.toFixed(1)}px;"></div>`);
    }

    const eventEmoji = getEventIconEmoji(listing?.event_icon);

    const html = `
      <div style="position:relative;width:${W}px;height:${H}px;">
        <!-- glow -->
        <div style="position:absolute;inset:-3px;border-radius:14px;background:radial-gradient(ellipse,rgba(255,200,50,0.15) 30%,transparent 75%);pointer-events:none;"></div>
        <!-- pill body: gold border + dark center -->
        <div style="position:absolute;inset:0;border-radius:11px;border:1.5px solid rgba(244,168,73,0.75);background:linear-gradient(180deg,#1c1200 0%,#0e0a00 100%);box-shadow:0 2px 6px rgba(0,0,0,0.55);overflow:hidden;">
          <!-- subtle inner warm sheen -->
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(255,180,30,0.08) 0%,transparent 70%);"></div>
          <!-- icon -->
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;">${eventEmoji}</div>
        </div>
        <!-- top bulbs -->
        ${topBulbs.join("")}
        <!-- bottom bulbs -->
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