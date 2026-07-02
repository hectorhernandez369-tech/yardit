import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const markerCache = {};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function formatPromoDateRange(promo) {
  const start = promo.starts_at ? new Date(promo.starts_at) : null;
  const end = promo.expires_at ? new Date(promo.expires_at) : null;
  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return "";
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth ? `${format(start, "MMMM d")}–${format(end, "d")}` : `${format(start, "MMM d")}–${format(end, "MMM d")}`;
}

function getPromoPosition(promo) {
  if (typeof promo.promo_door_lat === "number" && typeof promo.promo_door_lng === "number") {
    return [promo.promo_door_lat, promo.promo_door_lng];
  }
  if (promo.geographic_limit_type === "radius" && typeof promo.geo_center_lat === "number" && typeof promo.geo_center_lng === "number") {
    return [promo.geo_center_lat, promo.geo_center_lng];
  }
  return null;
}

function getAnimationStyle(animation) {
  if (animation === "pulse") return "animation:yardit-promo-pulse 1.8s ease-in-out infinite;";
  if (animation === "bounce") return "animation:yardit-promo-bounce 1.6s ease-in-out infinite;";
  if (animation === "float") return "animation:yardit-promo-float 2.4s ease-in-out infinite;";
  return "";
}

function metersPerPixel(lat, zoom) {
  return 40075016 * Math.cos((lat * Math.PI) / 180) / (256 * Math.pow(2, zoom));
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCoveredPinCount(promo, position, coverCandidates, zoom) {
  if (!position || !Array.isArray(coverCandidates)) return 0;
  const size = Math.max(32, Math.min(160, Number(promo.promo_icon_size_px || 72)));
  const coverRadiusMeters = (size * 0.72 + 18) * metersPerPixel(position[0], zoom || 13);
  return coverCandidates.filter((pin) => {
    if (typeof pin?.lat !== "number" || typeof pin?.lng !== "number") return false;
    return distanceMeters(position[0], position[1], pin.lat, pin.lng) <= coverRadiusMeters;
  }).length;
}

function getPromoIcon(promo, coveredCount = 0) {
  const size = Math.max(32, Math.min(160, Number(promo.promo_icon_size_px || 72)));
  const dateLabel = escapeHtml(formatPromoDateRange(promo));
  const hasCustomLogo = !!promo.promo_icon_logo_url;
  const logoUrl = promo.promo_icon_logo_url || "https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png";
  const animation = promo.promo_icon_animation || "none";
  const countLabel = Number(coveredCount || 0) > 0 ? String(coveredCount) : "";
  const key = `promo_tail_v5_${logoUrl}_${size}_${dateLabel}_${promo.promo_icon_glow_enabled !== false}_${animation}_${countLabel}_${hasCustomLogo}`;
  if (!markerCache[key]) {
    const glow = promo.promo_icon_glow_enabled !== false ? "box-shadow:0 0 0 8px rgba(244,168,73,.20),0 0 24px rgba(244,168,73,.72),0 6px 18px rgba(44,79,78,.30);" : "box-shadow:0 6px 18px rgba(44,79,78,.24);";
    const imageGlow = promo.promo_icon_glow_enabled !== false ? "filter:drop-shadow(0 0 12px rgba(244,168,73,.72)) drop-shadow(0 6px 8px rgba(44,79,78,.28));" : "filter:drop-shadow(0 5px 7px rgba(44,79,78,.24));";
    const customLogoNudge = hasCustomLogo ? Math.round(size * 0.1) : 0;
    const badgeTop = customLogoNudge + Math.round(size * 0.12);
    const badgeRight = Math.round(size * 0.08);
    const badge = countLabel ? `<div style="position:absolute;top:${badgeTop}px;right:${badgeRight}px;min-width:23px;height:23px;padding:0 6px;border-radius:999px;background:#2C4F4E;border:2px solid #F4A849;color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 7px rgba(0,0,0,.28);z-index:5;">${countLabel}</div>` : "";
    const dateBadge = dateLabel ? `<div style="position:absolute;top:${customLogoNudge + 2}px;left:50%;transform:translateX(-50%);height:22px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.96);border:1px solid rgba(44,79,78,.24);color:#2C4F4E;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 2px 7px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;z-index:5;">${dateLabel}</div>` : "";
    const iconBody = hasCustomLogo
      ? `<img src="${escapeHtml(logoUrl)}" alt="Promo" style="width:${size}px;height:${size}px;object-fit:contain;display:block;transform:translateY(${customLogoNudge}px);${imageGlow}" />`
      : `<div style="width:${size}px;height:${size}px;border-radius:22%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.96);border:2px solid #F4A849;${glow}"><img src="${escapeHtml(logoUrl)}" alt="Promo" style="width:${Math.round(size * .82)}px;height:${Math.round(size * .82)}px;object-fit:contain;display:block;" /></div>`;
    const tailHeight = 14;
    const iconWidth = size + 80;
    const visualIconHeight = size + customLogoNudge;
    const iconHeight = visualIconHeight;
    const tailTop = visualIconHeight - 2;
    const tail = `<div style="position:absolute;left:50%;top:${tailTop}px;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:${tailHeight}px solid #F4A849;filter:drop-shadow(0 2px 3px rgba(44,79,78,.32));"></div>`;
    markerCache[key] = L.divIcon({
      className: "yardit-promo-discovery-marker",
      html: `<div style="position:relative;width:${iconWidth}px;height:${iconHeight}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;pointer-events:auto;overflow:visible;transform-origin:center bottom;${getAnimationStyle(animation)}"><div style="position:relative;width:${size}px;height:${visualIconHeight}px;z-index:2;">${iconBody}${dateBadge}${badge}</div>${tail}</div>`,
      iconSize: [iconWidth, iconHeight],
      iconAnchor: [iconWidth / 2, iconHeight + tailHeight - 2],
      popupAnchor: [0, -iconHeight + 8],
    });
  }
  return markerCache[key];
}

function isActivePromo(promo, currentZoom = 13) {
  if (!promo?.promo_door_enabled || promo.status !== "active") return false;
  const minZoom = Number(promo.promo_min_zoom || 10);
  const maxZoom = Number(promo.promo_max_zoom || 18);
  const zoom = Number(currentZoom || 13);
  if (zoom < minZoom || zoom >= maxZoom) return false;
  return !!getPromoPosition(promo);
}

function preferredTier(promo) {
  const tiers = promo.applies_to_tiers || [];
  if (tiers.includes("featured")) return "featured";
  if (tiers.includes("premium")) return "premium";
  return "featured";
}

export default function PromoDiscoveryMarkers({ promos = [], currentZoom = 13, coverCandidates = [] }) {
  const navigate = useNavigate();
  const activePromos = promos.filter((promo) => isActivePromo(promo, currentZoom));

  return (
    <>
      {activePromos.map((promo) => {
        const position = getPromoPosition(promo);
        if (!position) return null;
        const coveredCount = getCoveredPinCount(promo, position, coverCandidates, currentZoom);
        return (
          <Marker key={`promo-door-${promo.id}-${coveredCount}-z${currentZoom}`} position={position} icon={getPromoIcon(promo, coveredCount)}>
            <Popup minWidth={250} className="leaflet-popup-transparent">
              <div className="rounded-2xl border border-amber-200 bg-white/95 p-4 text-center shadow-xl backdrop-blur-md">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">🎉</div>
                <h3 className="text-lg font-extrabold text-[#2C4F4E]">{promo.title || "Yardit Promotion"}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Celebrate Yardit's launch in {promo.geo_display_label || "this area"}!</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">The first eligible users can receive this special promotion.</p>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"
                    onClick={() => navigate(`${createPageUrl("CreateListing")}?promo=${encodeURIComponent(promo.code)}&tier=${preferredTier(promo)}&promoSource=map`)}
                  >
                    Create My Listing
                  </Button>
                  <Button size="sm" variant="outline" className="px-3" onClick={(event) => event.currentTarget.closest(".leaflet-popup")?.querySelector(".leaflet-popup-close-button")?.click()}>
                    Close
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}