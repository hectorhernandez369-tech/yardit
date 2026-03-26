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

export function getEventMarkerIcon(listing, isSelected = false) {
  const tier = listing?.event_tier || listing?.tier || "basic";
  const emoji = getEventIconEmoji(listing?.event_icon);
  const image = listing?.event_photos?.[0] || listing?.photoUrls?.[0];

  if (tier === "marquee") {
    const width = isSelected ? 64 : 56;
    const height = isSelected ? 74 : 66;
    const html = `<div style="width:${width}px;border-radius:14px;overflow:hidden;border:2px solid #111827;background:#111827;color:white;box-shadow:0 10px 22px rgba(0,0,0,0.35);"><div style="height:${height - 26}px;background:${image ? `url('${image}') center/cover no-repeat` : '#F4A849'};display:flex;align-items:center;justify-content:center;font-size:28px;">${image ? "" : emoji}</div><div style="padding:4px 6px;font-size:10px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${listing?.event_name || listing?.title || 'Event'}</div></div>`;
    return makeDivIcon(`event_marquee_${image || 'none'}_${listing?.id}_${isSelected}`, html, width, height);
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