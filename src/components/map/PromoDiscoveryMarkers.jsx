import React from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { clusterPoints, getClusterStyle } from "@/components/map/ClusterGroup";

const markerCache = {};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));
}

function formatPromoDateRange(promo) {
  const start = promo.starts_at ? new Date(promo.starts_at) : null;
  const end = promo.expires_at ? new Date(promo.expires_at) : null;

  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return "";

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  return sameMonth
    ? `${format(start, "MMMM d")}–${format(end, "d")}`
    : `${format(start, "MMM d")}–${format(end, "MMM d")}`;
}

function getPromoPosition(promo) {
  if (typeof promo.promo_door_lat === "number" && typeof promo.promo_door_lng === "number") {
    return [promo.promo_door_lat, promo.promo_door_lng];
  }

  if (
    promo.geographic_limit_type === "radius" &&
    typeof promo.geo_center_lat === "number" &&
    typeof promo.geo_center_lng === "number"
  ) {
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

function rectanglesOverlap(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function getPromoScreenBounds(promo, position, map) {
  if (!position || !map) return null;

  const size = Math.max(32, Math.min(160, Number(promo.promo_icon_size_px || 72)));
  const hasCustomLogo = !!promo.promo_icon_logo_url;
  const customLogoNudge = hasCustomLogo ? Math.round(size * 0.25) : 0;
  const artworkWidth = size;

  const iconWidth = size + 80;
  const iconHeight = size + customLogoNudge;
  const point = map.latLngToContainerPoint(position);

  const left = point.x - iconWidth / 2;
  const top = point.y - iconHeight / 2;
  const centerX = left + iconWidth / 2;

  return {
    left: centerX - artworkWidth / 2,
    right: centerX + artworkWidth / 2,
    top: top + customLogoNudge,
    bottom: top + customLogoNudge + size,
  };
}

function getStandardListingMarkerBounds(pin, map) {
  if (typeof pin?.lat !== "number" || typeof pin?.lng !== "number") return null;

  const point = map.latLngToContainerPoint([pin.lat, pin.lng]);
  const listingType = pin.listingType || pin.type;

  if (listingType === "event") {
    const residentialAddOns = pin.event_add_ons || {};
    const tier = residentialAddOns.marquee
      ? "marquee"
      : residentialAddOns.premium_visibility
        ? "premium"
        : pin.event_tier || pin.tier || "featured";
    const hasImage = !!pin.event_logo_url;
    const isFireworks = pin.event_icon === "fireworks";
    const size = isFireworks ? 46 : tier === "marquee" ? 46 : tier === "premium" ? (hasImage ? 26 : 24) : tier === "featured" ? (hasImage ? 30 : 28) : (hasImage ? 30 : 28);
    const anchorY = tier === "marquee" || tier === "premium" || tier === "featured" || hasImage ? size / 2 : size;

    return {
      left: point.x - size / 2,
      right: point.x + size / 2,
      top: point.y - anchorY,
      bottom: point.y - anchorY + size,
    };
  }

  if (listingType === "neighborhood_sale") {
    let scale = 1;
    const count = pin.homeCount || pin.confirmed_count || 0;
    if (count >= 20) scale = 1.35;
    else if (count >= 12) scale = 1.2;
    else if (count >= 5) scale = 1.05;
    const size = 30 * scale;
    return { left: point.x - size / 2, right: point.x + size / 2, top: point.y - size, bottom: point.y };
  }

  let size = 18;
  if (listingType === "halloween_candy" || listingType === "holiday_lights") size = 25;
  else if (pin.tier === "premium") size = 28;
  else if (pin.tier === "featured" || pin.tier === "map_pin") size = 25;

  const height = Math.round(size * 1.33);
  return { left: point.x - size / 2, right: point.x + size / 2, top: point.y - height, bottom: point.y };
}

function getClusterMarkerBounds(cluster, map) {
  const point = map.latLngToContainerPoint([cluster.lat, cluster.lng]);
  const style = getClusterStyle(cluster.count);
  const radius = style.radius;

  return {
    left: point.x - radius,
    right: point.x + radius,
    top: point.y - radius,
    bottom: point.y + radius,
  };
}

function getCoveredPinCount(promo, position, coverCandidates, map, clusterCandidates = [], clusterRadius = 50, clusterMinPoints = 2) {
  if (!position || !Array.isArray(coverCandidates) || !map) return 0;

  const promoBounds = getPromoScreenBounds(promo, position, map);
  if (!promoBounds) return 0;

  const countedIds = new Set();
  const clusteredIds = new Set();
  const clusters = Array.isArray(clusterCandidates)
    ? clusterPoints(clusterCandidates, map, clusterRadius).filter((cluster) => cluster.count >= clusterMinPoints)
    : [];

  clusters.forEach((cluster) => {
    cluster.ids.forEach((id) => clusteredIds.add(id));
    const clusterBounds = getClusterMarkerBounds(cluster, map);
    if (!rectanglesOverlap(promoBounds, clusterBounds)) return;
    cluster.ids.forEach((id) => countedIds.add(id));
  });

  coverCandidates.forEach((pin) => {
    const id = pin?.id || pin?.listingId;
    if (!id || countedIds.has(id) || clusteredIds.has(id)) return;

    const pinBounds = getStandardListingMarkerBounds(pin, map);
    if (!pinBounds || !rectanglesOverlap(promoBounds, pinBounds)) return;

    countedIds.add(id);
  });

  return countedIds.size;
}

function getPromoIcon(promo, coveredCount = 0) {
  const size = Math.max(32, Math.min(160, Number(promo.promo_icon_size_px || 72)));
  const rawDateLabel = formatPromoDateRange(promo);
  const dateLabel = escapeHtml(rawDateLabel);
  const hasCustomLogo = !!promo.promo_icon_logo_url;

  const logoUrl =
    promo.promo_icon_logo_url ||
    "https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png";

  const animation = promo.promo_icon_animation || "none";
  const countLabel = Number(coveredCount || 0) > 0 ? String(coveredCount) : "";

  const key = `promo_no_tail_v9_${logoUrl}_${size}_${dateLabel}_${promo.promo_icon_glow_enabled !== false}_${animation}_${countLabel}_${hasCustomLogo}`;

  if (!markerCache[key]) {
    const glow =
      promo.promo_icon_glow_enabled !== false
        ? "box-shadow:0 0 0 8px rgba(244,168,73,.20),0 0 24px rgba(244,168,73,.72),0 6px 18px rgba(44,79,78,.30);"
        : "box-shadow:0 6px 18px rgba(44,79,78,.24);";

    const artworkOutline = "drop-shadow(1px 0 0 rgba(239,68,68,.98)) drop-shadow(-1px 0 0 rgba(239,68,68,.98)) drop-shadow(0 1px 0 rgba(239,68,68,.98)) drop-shadow(0 -1px 0 rgba(239,68,68,.98)) drop-shadow(0 0 3px rgba(239,68,68,.9))";
    const imageGlow =
      promo.promo_icon_glow_enabled !== false
        ? `filter:${artworkOutline} drop-shadow(0 0 12px rgba(244,168,73,.72)) drop-shadow(0 6px 8px rgba(44,79,78,.28));`
        : `filter:${artworkOutline} drop-shadow(0 5px 7px rgba(44,79,78,.24));`;

    const customLogoNudge = hasCustomLogo ? Math.round(size * 0.25) : 0;
    const badgeTop = customLogoNudge + Math.round(size * 0.24);
    const badgeRight = Math.round(size * 0.18);

    const badge = countLabel
      ? `<div style="position:absolute;top:${badgeTop}px;right:${badgeRight}px;min-width:23px;height:23px;padding:0 6px;border-radius:999px;background:#2C4F4E;border:2px solid #F4A849;color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 7px rgba(0,0,0,.28);z-index:10;">${countLabel}</div>`
      : "";

    const dateBadge = dateLabel
      ? `<div style="position:absolute;top:${customLogoNudge + 2}px;left:50%;transform:translateX(-50%);height:22px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.96);border:1px solid rgba(44,79,78,.24);color:#2C4F4E;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 2px 7px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;z-index:10;">${dateLabel}</div>`
      : "";

    const iconBody = hasCustomLogo
      ? `<img src="${escapeHtml(logoUrl)}" alt="Promo" style="width:${size}px;height:${size}px;object-fit:contain;display:block;transform:translateY(${customLogoNudge}px);${imageGlow};position:relative;z-index:1;" />`
      : `<div style="width:${size}px;height:${size}px;border-radius:22%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.96);border:2px solid #ef4444;${glow};position:relative;z-index:1;"><img src="${escapeHtml(logoUrl)}" alt="Promo" style="width:${Math.round(size * 0.82)}px;height:${Math.round(size * 0.82)}px;object-fit:contain;display:block;" /></div>`;

    const iconWidth = size + 80;
    const visualIconHeight = size + customLogoNudge;
    const iconHeight = visualIconHeight;

    markerCache[key] = L.divIcon({
      className: "yardit-promo-discovery-marker",
      html: `<div style="position:relative;width:${iconWidth}px;height:${iconHeight}px;pointer-events:auto;overflow:visible;transform-origin:center bottom;${getAnimationStyle(animation)}"><div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:${size}px;height:${visualIconHeight}px;z-index:2;">${iconBody}${dateBadge}${badge}</div></div>`,
      iconSize: [iconWidth, iconHeight],
      iconAnchor: [iconWidth / 2, iconHeight / 2],
      popupAnchor: [0, -Math.round(iconHeight * 0.275) - 8],
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

export default function PromoDiscoveryMarkers({ promos = [], currentZoom = 13, coverCandidates = [], clusterCandidates = [], clusterRadius = 50, clusterMinPoints = 2 }) {
  const navigate = useNavigate();
  const map = useMap();
  const activePromos = promos.filter((promo) => isActivePromo(promo, currentZoom));

  return (
    <>
      {activePromos.map((promo) => {
        const position = getPromoPosition(promo);
        if (!position) return null;

        const coveredCount = getCoveredPinCount(promo, position, coverCandidates, map, clusterCandidates, clusterRadius, clusterMinPoints);

        return (
          <Marker
            key={`promo-door-${promo.id}-${coveredCount}-z${currentZoom}`}
            position={position}
            icon={getPromoIcon(promo, coveredCount)}
            zIndexOffset={1000}
          >
            <Popup minWidth={250} className="leaflet-popup-transparent">
              <div className="rounded-2xl border border-amber-200 bg-white/95 p-4 text-center shadow-xl backdrop-blur-md">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
                  🎉
                </div>

                <h3 className="text-lg font-extrabold text-[#2C4F4E]">
                  {promo.title || "Yardit Promotion"}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Celebrate Yardit's launch in {promo.geo_display_label || "this area"}!
                </p>

                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  The first eligible users can receive this special promotion.
                </p>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"
                    onClick={() =>
                      navigate(
                        `${createPageUrl("CreateListing")}?promo=${encodeURIComponent(
                          promo.code
                        )}&tier=${preferredTier(promo)}&promoSource=map`
                      )
                    }
                  >
                    Create My Listing
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="px-3"
                    onClick={(event) =>
                      event.currentTarget
                        .closest(".leaflet-popup")
                        ?.querySelector(".leaflet-popup-close-button")
                        ?.click()
                    }
                  >
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