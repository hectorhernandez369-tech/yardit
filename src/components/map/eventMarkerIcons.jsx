import L from "leaflet";
import { getEventIconEmoji, getBasicEventIconSvg } from "@/lib/eventListingConfig";
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
  const image = listing?.event_logo_url;

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

    // ── CLOSED-STATE: Mini Marquee — mirrors collapsed/expanded design system ──
    // Colors, border, bulb style all match MarqueeBoard exactly.
    const W = 46, H = 24;
    const bulbSize = 5;
    const bulbOff = -2.5;
    const bulbInset = 8;
    const bulbRadius = bulbSize / 2;
    const blinkStyle = `<style>@keyframes marqueePulse{0%,100%{opacity:0.42;filter:brightness(0.96);box-shadow:0 0 4px rgba(255,214,92,0.38),0 0 8px rgba(255,196,58,0.18)}50%{opacity:1;filter:brightness(1.08);box-shadow:0 0 6px rgba(255,221,120,0.52),0 0 12px rgba(255,196,58,0.26)}}</style>`;
    const B = `width:${bulbSize}px;height:${bulbSize}px;border-radius:50%;background:radial-gradient(circle at 38% 38%, rgba(255,250,198,0.98) 0%, rgba(255,221,102,0.95) 42%, rgba(255,184,28,0.92) 72%, rgba(201,117,0,0.88) 100%);box-shadow:0 0 4px rgba(255,214,92,0.48),0 0 8px rgba(255,196,58,0.24);position:absolute;z-index:3;will-change:opacity,filter,box-shadow;animation:marqueePulse 2.8s ease-in-out infinite;`;
    const B_ALT = `${B}animation-delay:1.4s;`;

    const bulbs = [];
    let bulbIndex = 0;
    const placeEdgeBulbs = (length, side) => {
      const usable = Math.max(length - bulbInset * 2, 0);
      const count = Math.max(2, Math.floor(usable / 15) + 1);
      const gap = count > 1 ? usable / (count - 1) : 0;
      const axisProp = side === "top" || side === "bottom" ? "left" : "top";

      for (let i = 0; i < count; i += 1) {
        const pos = bulbInset + gap * i;
        const bulbStyle = bulbIndex % 2 === 0 ? B : B_ALT;
        bulbs.push(`<div style="${bulbStyle}${side}:${bulbOff}px;${axisProp}:${(pos - bulbRadius).toFixed(1)}px;"></div>`);
        bulbIndex += 1;
      }
    };

    placeEdgeBulbs(W, "top");
    placeEdgeBulbs(W, "bottom");
    placeEdgeBulbs(H, "left");
    placeEdgeBulbs(H, "right");

    // Background: use marquee_background_url with dark overlay (same as collapsed/expanded board)
    const bgUrl = listing?.marquee_background_url;
    const bgStyle = bgUrl
      ? `background:linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)),url('${bgUrl}');background-size:cover;background-position:center;`
      : `background:linear-gradient(to bottom,#7c2d12,#3f1d0b);`;

    const html = `<div style="position:relative;width:${W}px;height:${H}px;overflow:visible;">
  ${blinkStyle}
  <div style="position:absolute;inset:0;border-radius:6px;border:1px solid #f4a849;${bgStyle}box-shadow:0 5px 14px rgba(0,0,0,0.3);overflow:visible;"></div>
  ${bulbs.join("")}
</div>`;

    return makeDivIcon(`event_marquee_closed_${listing?.id}_${isSelected}`, html, W, H, W / 2, H / 2);
  }

  if (tier === "premium") {
    if (image) {
      const size = isSelected ? 29 : 26;
      const html = `<img src="${image}" alt="Event" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));" />`;
      return makeDivIcon(`event_premium_img_${image}_${isSelected}`, html, size, size, size / 2, size / 2);
    }
    const fontSize = isSelected ? 27 : 24;
    const size = fontSize;
    const html = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));">${emoji}</div>`;
    return makeDivIcon(`event_premium_icon_${emoji}_${isSelected}`, html, size, size, size / 2, size / 2);
  }

  if (tier === "featured") {
    if (image) {
      const size = isSelected ? 34 : 30;
      const html = `<img src="${image}" alt="Event" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));" />`;
      return makeDivIcon(`event_featured_img_${image}_${isSelected}`, html, size, size, size / 2, size / 2);
    }
    const fontSize = isSelected ? 32 : 28;
    const size = fontSize;
    const html = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));">${emoji}</div>`;
    return makeDivIcon(`event_featured_${emoji}_${isSelected}`, html, size, size, size / 2, size / 2);
  }

  if (image) {
    const size = isSelected ? 34 : 30;
    const html = `<img src="${image}" alt="Event" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));" />`;
    return makeDivIcon(`event_basic_img_${image}_${isSelected}`, html, size, size, size / 2, size / 2);
  }

  const size = isSelected ? 32 : 28;
  const iconKey = listing?.event_icon;
  const svgContent = getBasicEventIconSvg(iconKey, size * 0.55, "#111827");
  const html = svgContent
    ? `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:2px solid #111827;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.22);">${svgContent}</div>`
    : `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:2px solid #111827;background:white;color:#111827;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 10px rgba(0,0,0,0.22);">${emoji}</div>`;
  return makeDivIcon(`event_basic_${iconKey || emoji}_${isSelected}`, html, size, size, size / 2, size);
}