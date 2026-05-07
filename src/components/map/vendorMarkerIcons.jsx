import L from "leaflet";

const cache = {};

export function getVendorMarkerIcon({ pin, account, checkIn, selected = false }) {
  const tier = account?.vendor_tier || "starter";
  const image = pin?.pin_icon_style === "truck_logo" ? (pin?.pin_logo_url || pin?.pin_icon_url || account?.business_logo) : null;
  const size = selected ? 42 : 36;
  const animation = tier === "growth" ? checkIn?.pin_animation : "none";
  const animationCss = animation === "bounce" ? "animation:vendorBounce 1.2s ease-in-out infinite;" : animation === "pulse" ? "animation:vendorPulse 1.6s ease-in-out infinite;" : "";
  const key = `vendor_${tier}_${image || "default"}_${animation}_${selected}`;

  if (!cache[key]) {
    const markerHtml = image
      ? `<img src='${image}' alt='Vendor' style='width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,.32));${animationCss}'/>`
      : `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#F4A849;border:3px solid #2C4F4E;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.32);${animationCss}"><span style='font-size:20px;'>🚚</span></div>`;
    const html = `<style>@keyframes vendorPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}@keyframes vendorBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}</style>${markerHtml}`;
    cache[key] = L.divIcon({
      className: "vendor-marker",
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size + 4],
    });
  }

  return cache[key];
}

export function shouldShowVendorPinAtZoom(account, zoom) {
  const tier = account?.vendor_tier || "starter";
  if (tier === "growth") return zoom >= 11;
  if (tier === "pro") return zoom >= 13;
  return zoom >= 15;
}