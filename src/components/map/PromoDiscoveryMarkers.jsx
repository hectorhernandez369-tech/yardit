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
  if (promo.geographic_limit_type === "radius") {
    return typeof promo.geo_center_lat === "number" && typeof promo.geo_center_lng === "number"
      ? [promo.geo_center_lat, promo.geo_center_lng]
      : null;
  }
  return typeof promo.promo_door_lat === "number" && typeof promo.promo_door_lng === "number"
    ? [promo.promo_door_lat, promo.promo_door_lng]
    : null;
}

function getPromoIcon(promo) {
  const size = Math.max(32, Math.min(160, Number(promo.promo_icon_size_px || 72)));
  const dateLabel = escapeHtml(formatPromoDateRange(promo));
  const logoUrl = promo.promo_icon_logo_url || "https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png";
  const key = `${logoUrl}_${size}_${dateLabel}_${promo.promo_icon_glow_enabled !== false}`;
  if (!markerCache[key]) {
    const glow = promo.promo_icon_glow_enabled !== false ? "box-shadow:0 0 0 8px rgba(244,168,73,.20),0 0 24px rgba(244,168,73,.72),0 6px 18px rgba(44,79,78,.30);" : "box-shadow:0 6px 18px rgba(44,79,78,.24);";
    markerCache[key] = L.divIcon({
      className: "yardit-promo-discovery-marker",
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;transform:translateY(-4px);"><div style="width:${size}px;height:${size}px;border-radius:22%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.96);border:2px solid #F4A849;${glow}"><img src="${escapeHtml(logoUrl)}" alt="Promo" style="width:${Math.round(size * .82)}px;height:${Math.round(size * .82)}px;object-fit:contain;display:block;" /></div>${dateLabel ? `<div style="padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.96);border:1px solid rgba(44,79,78,.22);color:#2C4F4E;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,.16);">${dateLabel}</div>` : ""}</div>`,
      iconSize: [size + 80, size + 34],
      iconAnchor: [(size + 80) / 2, size + 20],
      popupAnchor: [0, -size - 18],
    });
  }
  return markerCache[key];
}

function isActivePromo(promo, now = new Date()) {
  if (!promo?.promo_door_enabled || promo.status !== "active") return false;
  const start = promo.starts_at ? new Date(promo.starts_at) : null;
  const end = promo.expires_at ? new Date(promo.expires_at) : null;
  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return false;
  if (now < start || now > end) return false;
  return !!getPromoPosition(promo);
}

function preferredTier(promo) {
  const tiers = promo.applies_to_tiers || [];
  if (tiers.includes("featured")) return "featured";
  if (tiers.includes("premium")) return "premium";
  return "featured";
}

export default function PromoDiscoveryMarkers({ promos = [] }) {
  const navigate = useNavigate();
  const activePromos = promos.filter((promo) => isActivePromo(promo));

  return (
    <>
      {activePromos.map((promo) => {
        const position = getPromoPosition(promo);
        if (!position) return null;
        return (
          <Marker key={`promo-door-${promo.id}`} position={position} icon={getPromoIcon(promo)}>
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