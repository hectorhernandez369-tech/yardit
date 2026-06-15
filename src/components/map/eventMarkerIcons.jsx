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
  const residentialEventAddOns = listing?.listingType === "event" && !listing?.is_vendor_event ? (listing?.event_add_ons || {}) : {};
  const tier = listing?.listingType === "event" && !listing?.is_vendor_event
    ? residentialEventAddOns.marquee
      ? "marquee"
      : residentialEventAddOns.premium_visibility
      ? "premium"
      : "featured"
    : listing?.event_tier || listing?.tier || "basic";
  const emoji = getEventIconEmoji(listing?.event_icon);
  const image = listing?.event_logo_url;
  const hasResidentialCustomIcon = !!residentialEventAddOns.custom_icon && !!image;
  const opacity = listing?.ownerUpcomingPreview ? 0.58 : 1;
  const markerAnimation = listing?.listingType === "event" && !listing?.is_vendor_event ? listing?.event_animation : "";
  const animationKeyframes = markerAnimation ? `<style>@keyframes yarditEventPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}@keyframes yarditEventBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}</style>` : "";
  const animationStyle = markerAnimation === "pulse" ? "animation:yarditEventPulse 1.4s ease-in-out infinite;" : markerAnimation === "bounce" ? "animation:yarditEventBounce 1.1s ease-in-out infinite;" : "";
  const wrapAnimation = (html) => animationStyle ? `${animationKeyframes}<div style="${animationStyle}">${html}</div>` : html;

  if (hasResidentialCustomIcon) {
    const size = isSelected ? 34 : 30;
    const html = `<img src="${image}" alt="Event" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));" />`;
    return makeDivIcon(`event_custom_icon_${image}_${isSelected}_${opacity}_${markerAnimation}`, wrapAnimation(html), size, size, size / 2, size / 2);
  }

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
        
      let htmlHash = 0;
      for (let i = 0; i < marqueeHtml.length; i++) htmlHash = Math.imul(31, htmlHash) + marqueeHtml.charCodeAt(i) | 0;

      const cacheKey = `event_marquee_board_${listing?.id}_${boardWidth}_z${isCollapsed ? zoom : 0}_${htmlHash}`;
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
    const blinkStyle = `<style>@keyframes marqueePulse{0%,100%{opacity:.48;transform:scale(.97);box-shadow:0 0 4px rgba(255,224,130,0.26),0 0 8px rgba(255,196,77,0.14),0 0 12px rgba(245,158,11,0.06)}50%{opacity:.98;transform:scale(1.08);box-shadow:0 0 6px rgba(255,224,130,0.4),0 0 10px rgba(255,196,77,0.2),0 0 16px rgba(245,158,11,0.08)}}</style>`;
    const B = `width:${bulbSize}px;height:${bulbSize}px;border-radius:50%;background:radial-gradient(circle at 38% 38%, rgba(255,251,224,0.98) 0%, rgba(255,226,130,0.96) 40%, rgba(255,201,74,0.92) 70%, rgba(245,158,11,0.86) 100%);box-shadow:0 0 4px rgba(255,224,130,0.34),0 0 8px rgba(255,196,77,0.18),0 0 12px rgba(245,158,11,0.08);position:absolute;z-index:3;will-change:opacity,transform,box-shadow;animation:marqueePulse 2.6s ease-in-out infinite;`;
    const B_ALT = `${B}animation-delay:1.3s;`;

    const bulbs = [];
    let bulbIndex = 0;
    const horizontalDensity = 10;
    const sideTopInset = 8;
    const sideBottomInset = 8;
    const sideCount = 1;
    const getHorizontalCount = (length) => {
      const usable = Math.max(length - bulbInset * 2, 0);
      return Math.max(2, Math.round(usable / horizontalDensity) + 1);
    };

    const distributeWithCorners = (length, count, inset) => {
      const usable = Math.max(length - inset * 2, 0);
      if (count <= 1) return [inset + usable / 2];
      const gap = usable / (count - 1);
      return Array.from({ length: count }, (_, i) => bulbInset + gap * i);
    };

    const distributeSides = (length, count, topInset, bottomInset) => {
      const usable = Math.max(length - topInset - bottomInset, 0);
      if (count <= 0) return [];
      if (count === 1) return [topInset + usable / 2];
      const gap = usable / (count - 1);
      return Array.from({ length: count }, (_, i) => topInset + gap * i);
    };

    const horizontalCount = getHorizontalCount(W);
    const horizontalPositions = distributeWithCorners(W, horizontalCount, bulbInset);
    const sidePositions = distributeSides(H, sideCount, sideTopInset, sideBottomInset);

    horizontalPositions.forEach((x) => {
      const bulbStyleTop = bulbIndex % 2 === 0 ? B : B_ALT;
      bulbs.push(`<div style="${bulbStyleTop}top:${bulbOff}px;left:${(x - bulbRadius).toFixed(1)}px;"></div>`);
      bulbIndex += 1;
      const bulbStyleBottom = bulbIndex % 2 === 0 ? B : B_ALT;
      bulbs.push(`<div style="${bulbStyleBottom}bottom:${bulbOff}px;left:${(x - bulbRadius).toFixed(1)}px;"></div>`);
      bulbIndex += 1;
    });

    sidePositions.forEach((y) => {
      const bulbStyleLeft = bulbIndex % 2 === 0 ? B_ALT : B;
      bulbs.push(`<div style="${bulbStyleLeft}left:${bulbOff}px;top:${(y - bulbRadius).toFixed(1)}px;"></div>`);
      bulbIndex += 1;
      const bulbStyleRight = bulbIndex % 2 === 0 ? B_ALT : B;
      bulbs.push(`<div style="${bulbStyleRight}right:${bulbOff}px;top:${(y - bulbRadius).toFixed(1)}px;"></div>`);
      bulbIndex += 1;
    });

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
      const html = `<img src="${image}" alt="Event" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));" />`;
      return makeDivIcon(`event_premium_img_${image}_${isSelected}_${opacity}_${markerAnimation}`, wrapAnimation(html), size, size, size / 2, size / 2);
    }
    const fontSize = isSelected ? 27 : 24;
    const size = fontSize;
    const html = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;line-height:1;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));">${emoji}</div>`;
    return makeDivIcon(`event_premium_icon_${emoji}_${isSelected}_${opacity}_${markerAnimation}`, wrapAnimation(html), size, size, size / 2, size / 2);
  }

  if (tier === "featured") {
    if (image) {
      const size = isSelected ? 34 : 30;
      const html = `<img src="${image}" alt="Event" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));" />`;
      return makeDivIcon(`event_featured_img_${image}_${isSelected}_${opacity}_${markerAnimation}`, wrapAnimation(html), size, size, size / 2, size / 2);
    }
    const fontSize = isSelected ? 32 : 28;
    const size = fontSize;
    const html = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;line-height:1;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));">${emoji}</div>`;
    return makeDivIcon(`event_featured_${emoji}_${isSelected}_${opacity}_${markerAnimation}`, wrapAnimation(html), size, size, size / 2, size / 2);
  }

  if (image) {
    const size = isSelected ? 34 : 30;
    const html = `<img src="${image}" alt="Event" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));" />`;
    return makeDivIcon(`event_basic_img_${image}_${isSelected}_${opacity}_${markerAnimation}`, wrapAnimation(html), size, size, size / 2, size / 2);
  }

  const size = isSelected ? 32 : 28;
  const iconKey = listing?.event_icon;
  const svgContent = getBasicEventIconSvg(iconKey, size * 0.55, "#111827");
  const html = svgContent
    ? `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:2px solid #111827;background:white;display:flex;align-items:center;justify-content:center;opacity:${opacity};box-shadow:0 4px 10px rgba(0,0,0,0.22);">${svgContent}</div>`
    : `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:2px solid #111827;background:white;color:#111827;display:flex;align-items:center;justify-content:center;font-size:18px;opacity:${opacity};box-shadow:0 4px 10px rgba(0,0,0,0.22);">${emoji}</div>`;
  return makeDivIcon(`event_basic_${iconKey || emoji}_${isSelected}_${opacity}_${markerAnimation}`, wrapAnimation(html), size, size, size / 2, size);
}