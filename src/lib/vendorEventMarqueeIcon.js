import L from "leaflet";
import "@/components/map/vendorEventMarquee.css";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

export default function vendorEventMarqueeIcon(event, isComingSoon, stackCount) {
  const bulbs = [];
  for (let i = 0; i < 10; i += 1) {
    const left = 5 + i * 10;
    bulbs.push(`<i class="yardit-event-marquee-bulb" style="left:${left}%;top:7%"></i>`, `<i class="yardit-event-marquee-bulb" style="left:${left}%;top:93%"></i>`);
  }
  for (let i = 1; i < 5; i += 1) {
    const top = 7 + i * 17.2;
    bulbs.push(`<i class="yardit-event-marquee-bulb" style="left:4%;top:${top}%"></i>`, `<i class="yardit-event-marquee-bulb" style="left:96%;top:${top}%"></i>`);
  }
  return L.divIcon({
    className: "",
    html: `<div class="yardit-event-marquee">${bulbs.join("")}<div class="yardit-event-marquee-title">${escapeHtml(event.title)}</div><div class="yardit-event-marquee-status">${isComingSoon ? "Coming Soon" : "Active Now"}</div>${stackCount > 0 ? `<span class="yardit-event-marquee-stack">+${stackCount}</span>` : ""}</div>`,
    iconSize: [156, 82],
    iconAnchor: [78, 82],
    popupAnchor: [0, -84],
  });
}