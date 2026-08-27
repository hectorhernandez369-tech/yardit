import React from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";

const normalIcon = L.divIcon({
  className: "halloween-location-marker",
  html: `<svg width="28" height="37" viewBox="0 0 24 32" aria-label="Halloween location"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#9333ea" stroke="#ffffff" stroke-width="2"/></svg>`,
  iconSize: [28, 37],
  iconAnchor: [14, 37],
  popupAnchor: [0, -37],
});

function teaserIcon(location) {
  const title = String(location.title || "Coming Soon").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const html = `<div style="width:96px;text-align:center;"><img src="${location.custom_icon_url}" alt="Halloween" style="display:block;width:56px;height:56px;margin:0 auto;object-fit:contain;filter:drop-shadow(0 3px 5px rgba(0,0,0,.4));"><div style="margin-top:2px;color:#fff;font-size:11px;font-weight:800;line-height:1.05;text-shadow:0 1px 2px #000,0 0 4px #000;white-space:nowrap;">${title}</div></div>`;
  return L.divIcon({ className: "halloween-location-teaser", html, iconSize: [96, 72], iconAnchor: [48, 72], popupAnchor: [0, -70] });
}

export default function HalloweenLocationMarkers({ locations = [], now = new Date() }) {
  return locations.filter((location) => location.type === "halloween_candy" && location.status === "active").map((location) => {
    const teaser = location.custom_icon_url && location.teaser_until && now < new Date(location.teaser_until);
    return (
      <Marker key={location.id} position={[location.latitude, location.longitude]} icon={teaser ? teaserIcon(location) : normalIcon}>
        <Popup minWidth={190}>
          <div className="space-y-1 text-sm"><p className="font-bold text-slate-950">{location.title}</p><p className="text-xs font-semibold text-purple-700">{teaser ? "Coming Soon" : "Halloween Location"}</p><p className="text-xs text-slate-600">{location.address}</p></div>
        </Popup>
      </Marker>
    );
  });
}