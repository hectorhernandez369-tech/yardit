import L from "leaflet";
import { getEventIconEmoji } from "@/lib/eventListingConfig";

const cache = {};

function makeDivIcon(key, html, size, anchorY) {
  if (!cache[key]) {
    cache[key] = L.divIcon({
      className: "event-marker",
      html,
      iconSize: [size, anchorY],
      iconAnchor: [size / 2, anchorY],
      popupAnchor: [0, -anchorY + 4],
    });
  }
  return cache[key];
}

export function getEventMarkerIcon(listing, isSelected = false, marqueeOpen = true) {
  const tier = listing?.event_tier || listing?.tier || "basic";
  const emoji = getEventIconEmoji(listing?.event_icon);
  const image = listing?.event_logo_url || listing?.event_photos?.[0] || listing?.photoUrls?.[0];

  if (tier === "marquee") {
    if (marqueeOpen) {
      return makeDivIcon(
        `event_marquee_anchor_${listing?.id}_${isSelected}`,
        '<div style="width:1px;height:1px;opacity:0;pointer-events:none;"></div>',
        1,
        1,
      );
    }

    const size = 28;
    const html = `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:flex-end;justify-content:center;"><div style="position:absolute;left:2px;bottom:6px;width:10px;height:18px;background:linear-gradient(180deg, rgba(255,245,157,0.75), rgba(255,214,10,0));clip-path:polygon(50% 0%, 100% 100%, 0% 100%);transform:rotate(-16deg);"></div><div style="position:absolute;right:2px;bottom:6px;width:10px;height:18px;background:linear-gradient(180deg, rgba(255,245,157,0.75), rgba(255,214,10,0));clip-path:polygon(50% 0%, 100% 100%, 0% 100%);transform:rotate(16deg);"></div><div style="position:relative;width:18px;height:18px;border-radius:9999px;background:#111827;border:2px solid #f4a849;box-shadow:0 0 10px rgba(255,214,10,0.75), 0 4px 10px rgba(0,0,0,0.28);"></div></div>`;
    return makeDivIcon(`event_marquee_closed_${listing?.id}_${isSelected}`, html, size, size);
  }

  if (tier === "premium") {
    const size = isSelected ? 48 : 42;
    const html = image
      ? `<div style="width:${size}px;height:${size}px;border-radius:9999px;overflow:hidden;border:3px solid #F4A849;background:#fff;box-shadow:0 8px 16px rgba(0,0,0,0.3);"><img src="${image}" alt="Event" style="width:100%;height:100%;object-fit:cover;" /></div>`
      : `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:3px solid #F4A849;background:#2C4F4E;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 16px rgba(0,0,0,0.3);">${emoji}</div>`;
    return makeDivIcon(`event_premium_${image || emoji}_${isSelected}`, html, size, size);
  }

  if (tier === "featured") {
    const size = isSelected ? 38 : 34;
    const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:3px solid #2C4F4E;background:#5DADA5;color:white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 14px rgba(0,0,0,0.28);">${emoji}</div>`;
    return makeDivIcon(`event_featured_${emoji}_${isSelected}`, html, size, size);
  }

  const size = isSelected ? 32 : 28;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:9999px;border:2px solid #111827;background:white;color:#111827;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 10px rgba(0,0,0,0.22);">${emoji}</div>`;
  return makeDivIcon(`event_basic_${emoji}_${isSelected}`, html, size, size);
}