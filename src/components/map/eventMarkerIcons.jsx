import L from "leaflet";
import { getEventIconEmoji } from "@/lib/eventListingConfig";
import { formatMarqueeSlotTime, getVisibleMarqueeSlots, hasMoreMarqueeSlots } from "@/lib/marqueeSchedule";

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
    if (!marqueeOpen) {
      const size = 28;
      const html = `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:flex-end;justify-content:center;"><div style="position:absolute;left:2px;bottom:6px;width:10px;height:18px;background:linear-gradient(180deg, rgba(255,245,157,0.95), rgba(255,214,10,0));clip-path:polygon(50% 0%, 100% 100%, 0% 100%);transform:rotate(-16deg);"></div><div style="position:absolute;right:2px;bottom:6px;width:10px;height:18px;background:linear-gradient(180deg, rgba(255,245,157,0.95), rgba(255,214,10,0));clip-path:polygon(50% 0%, 100% 100%, 0% 100%);transform:rotate(16deg);"></div><div style="position:relative;width:18px;height:18px;border-radius:9999px;background:#111827;border:2px solid #f4a849;box-shadow:0 0 10px rgba(255,214,10,0.75), 0 4px 10px rgba(0,0,0,0.28);"></div></div>`;
      return makeDivIcon(`event_marquee_closed_${listing?.id}_${isSelected}`, html, size, size);
    }

    const visibleSlots = getVisibleMarqueeSlots(listing);
    const moreSlots = hasMoreMarqueeSlots(listing);
    const slotsHtml = visibleSlots.slice(0, 4).map((slot) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 6px;border-radius:8px;background:rgba(255,255,255,0.08);font-size:10px;line-height:1.2;"><span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${slot.label}</span><span style="white-space:nowrap;color:#FDE68A;">${formatMarqueeSlotTime(slot)}</span></div>`).join("");
    const detailsHtml = moreSlots ? `<div style="margin-top:6px;font-size:10px;font-weight:700;color:#FDE68A;text-align:right;">View Details</div>` : "";
    const title = listing?.event_name || listing?.title || "Event";
    const width = 188;
    const height = 164;
    const html = `<div style="position:relative;width:${width}px;"><div style="position:relative;background:linear-gradient(180deg,#7c2d12 0%,#3f1d0b 100%);border:4px solid #f4a849;border-radius:16px;padding:12px 12px 10px;box-shadow:0 0 0 2px #2b1609 inset, 0 0 18px rgba(255,214,10,0.75), 0 12px 24px rgba(0,0,0,0.35);color:#fff;"><div style="position:absolute;inset:6px;border-radius:12px;border:2px dashed rgba(255,245,157,0.85);pointer-events:none;"></div><div style="display:grid;grid-template-columns:repeat(9,1fr);gap:6px;position:absolute;top:-7px;left:10px;right:10px;pointer-events:none;">${Array.from({ length: 9 }).map(() => `<span style="width:8px;height:8px;border-radius:9999px;background:#fff3b0;box-shadow:0 0 8px rgba(255,230,128,0.95);"></span>`).join("")}</div><div style="display:grid;grid-template-columns:repeat(9,1fr);gap:6px;position:absolute;bottom:-7px;left:10px;right:10px;pointer-events:none;">${Array.from({ length: 9 }).map(() => `<span style="width:8px;height:8px;border-radius:9999px;background:#fff3b0;box-shadow:0 0 8px rgba(255,230,128,0.95);"></span>`).join("")}</div><div style="font-size:14px;font-weight:900;line-height:1.1;letter-spacing:0.04em;text-transform:uppercase;text-align:center;margin-bottom:10px;padding:2px 8px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${title}</div><div style="display:grid;gap:6px;min-height:90px;">${slotsHtml || `<div style="padding:10px 8px;border-radius:10px;background:rgba(255,255,255,0.08);font-size:10px;text-align:center;color:#FDE68A;">View Details</div>`}</div>${detailsHtml}</div><div style="position:absolute;left:50%;transform:translateX(-50%);bottom:-16px;width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:18px solid #3f1d0b;filter:drop-shadow(0 4px 4px rgba(0,0,0,0.28));"></div></div>`;
    return makeDivIcon(`event_marquee_open_${listing?.id}_${visibleSlots.map((slot) => slot.id).join('_')}_${moreSlots}_${isSelected}`, html, width, height);
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