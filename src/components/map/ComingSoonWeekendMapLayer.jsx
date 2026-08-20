import React, { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { CalendarDays, Check } from "lucide-react";

const HIDDEN_STATUSES = new Set([
  "draft",
  "hidden",
  "under_review",
  "suspended",
  "completed",
  "expired",
  "closed",
  "cancelled",
  "canceled",
  "deleted",
  "removed",
  "payment_pending",
  "pending_payment",
]);

function pad(value) {
  return String(value).padStart(2, "0");
}

function toLocalYmd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getThisWeekendWindow(now = new Date()) {
  const day = now.getDay();
  let fridayOffset;

  if (day === 0) fridayOffset = -2;
  else if (day === 6) fridayOffset = -1;
  else fridayOffset = (5 - day + 7) % 7;

  const friday = new Date(now);
  friday.setHours(0, 0, 0, 0);
  friday.setDate(friday.getDate() + fridayOffset);

  const sunday = new Date(friday);
  sunday.setDate(sunday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: friday,
    end: sunday,
    startYmd: toLocalYmd(friday),
    endYmd: toLocalYmd(sunday),
  };
}

function isValidCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function dateRangeOverlapsWeekend(listing, weekend) {
  const activeDates = Array.isArray(listing?.activeDates) ? listing.activeDates.filter(Boolean) : [];
  if (activeDates.some((date) => date >= weekend.startYmd && date <= weekend.endYmd)) return true;

  const rangeStart = listing?.selectedRangeStartDate || "";
  const rangeEnd = listing?.selectedRangeEndDate || rangeStart;
  if (rangeStart && rangeEnd && rangeStart <= weekend.endYmd && rangeEnd >= weekend.startYmd) return true;

  const start = listing?.startDateTime ? new Date(listing.startDateTime) : null;
  const end = listing?.endDateTime ? new Date(listing.endDateTime) : start;
  if (start && !Number.isNaN(start.getTime())) {
    const safeEnd = end && !Number.isNaN(end.getTime()) ? end : start;
    return start <= weekend.end && safeEnd >= weekend.start;
  }

  return false;
}

function distanceMiles(lat1, lng1, lat2, lng2) {
  const earthRadiusMiles = 3958.7613;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ComingSoonWeekendToggle({ enabled, onToggle, radiusMiles, onRadiusChange }) {
  const handleToggle = () => {
    if (!enabled) {
      onRadiusChange(1);
      onToggle(true);
      return;
    }
    onToggle(false);
  };

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleToggle}
        aria-pressed={enabled}
        className={`h-9 rounded-full shadow-sm px-2 sm:px-3 whitespace-nowrap ${enabled ? "border-[#F4A849] bg-[#FFF7E8] text-[#2C4F4E] hover:bg-[#FFF2D8]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
      >
        {enabled ? <Check className="w-4 h-4 sm:mr-1" /> : <CalendarDays className="w-4 h-4 sm:mr-1" />}
        <span className="hidden sm:inline">Upcoming This Weekend</span>
        <span className="sm:hidden">Upcoming</span>
      </Button>

      {enabled && (
        <div className="absolute right-0 top-full mt-1.5 z-[1500] w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg sm:w-56 sm:p-3">
          <div className="mb-1 flex items-center justify-between gap-2 sm:mb-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-800 sm:text-xs">Search radius</p>
              <p className="hidden text-[11px] text-slate-500 sm:block">This weekend's yard sales</p>
            </div>
            <span className="text-xs font-bold text-[#2C4F4E] sm:text-sm">{radiusMiles} mi</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={radiusMiles}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            className="w-full accent-[#5DADA5]"
            aria-label="Upcoming sale search radius"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>1 mi</span>
            <span>50 mi</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComingSoonWeekendMapLayer({ enabled, listings = [], userLocation, radiusMiles = 1 }) {
  const map = useMap();
  const layerRef = useRef(L.layerGroup());
  const weekend = useMemo(() => getThisWeekendWindow(new Date()), []);

  const weekendSales = useMemo(() => {
    return listings.filter((listing) => {
      if (listing?.listingType !== "yard_sale") return false;
      if (HIDDEN_STATUSES.has(String(listing?.status || "").toLowerCase())) return false;
      if (!isValidCoordinate(listing?.lat) || !isValidCoordinate(listing?.lng)) return false;
      return dateRangeOverlapsWeekend(listing, weekend);
    });
  }, [listings, weekend]);

  useEffect(() => {
    layerRef.current.addTo(map);
    return () => layerRef.current.remove();
  }, [map]);

  useEffect(() => {
    const renderLayer = () => {
      layerRef.current.clearLayers();
      if (!enabled) return;

      const center = userLocation && isValidCoordinate(userLocation.lat) && isValidCoordinate(userLocation.lng)
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : map.getCenter();

      const radiusCircle = L.circle([center.lat, center.lng], {
        radius: radiusMiles * 1609.344,
        color: "#006168",
        weight: 2,
        opacity: 0.9,
        fillColor: "#5DADA5",
        fillOpacity: 0.12,
        interactive: false,
      });
      layerRef.current.addLayer(radiusCircle);

      const count = weekendSales.filter(
        (listing) => distanceMiles(center.lat, center.lng, listing.lat, listing.lng) <= radiusMiles
      ).length;

      const countIcon = L.divIcon({
        className: "yardit-upcoming-radius-count",
        html: `<div style="width:42px;height:42px;border-radius:9999px;background:#2C4F4E;border:3px solid #F4A849;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,.25);cursor:pointer;">${count}</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const countMarker = L.marker([center.lat, center.lng], {
        icon: countIcon,
        interactive: true,
        keyboard: true,
        zIndexOffset: 9000,
      });
      const listingWord = count === 1 ? "listing" : "listings";
      countMarker.bindPopup(
        `<div style="text-align:center;min-width:170px;"><div style="font-weight:800;color:#2C4F4E;font-size:15px;">${count} ${listingWord} this weekend</div><div style="font-size:12px;margin-top:4px;color:#64748b;">in this area</div></div>`,
        { closeButton: true, offset: [0, -18] }
      );
      layerRef.current.addLayer(countMarker);
    };

    renderLayer();
    map.on("zoomend", renderLayer);
    map.on("moveend", renderLayer);
    return () => {
      map.off("zoomend", renderLayer);
      map.off("moveend", renderLayer);
      layerRef.current.clearLayers();
    };
  }, [enabled, map, radiusMiles, userLocation, weekendSales]);

  return null;
}
