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

function clusterPoints(points, map, radiusPixels = 58) {
  const clusters = [];
  const used = new Set();

  for (let i = 0; i < points.length; i += 1) {
    if (used.has(i)) continue;

    const anchor = map.latLngToContainerPoint([points[i].lat, points[i].lng]);
    const group = [points[i]];
    used.add(i);

    for (let j = i + 1; j < points.length; j += 1) {
      if (used.has(j)) continue;
      const candidate = map.latLngToContainerPoint([points[j].lat, points[j].lng]);
      const dx = anchor.x - candidate.x;
      const dy = anchor.y - candidate.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radiusPixels) {
        group.push(points[j]);
        used.add(j);
      }
    }

    clusters.push({
      lat: group.reduce((sum, point) => sum + point.lat, 0) / group.length,
      lng: group.reduce((sum, point) => sum + point.lng, 0) / group.length,
      count: group.length,
      points: group,
    });
  }

  return clusters;
}

function getBubbleSize(count) {
  if (count >= 50) return 48;
  if (count >= 20) return 44;
  if (count >= 10) return 40;
  if (count >= 5) return 36;
  return 32;
}

export function ComingSoonWeekendToggle({ enabled, onToggle, radiusMiles, onRadiusChange }) {
  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onToggle(!enabled)}
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
            min="5"
            max="50"
            step="5"
            value={radiusMiles}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            className="w-full accent-[#5DADA5]"
            aria-label="Upcoming sale search radius"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>5 mi</span>
            <span>50 mi</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComingSoonWeekendMapLayer({ enabled, listings = [], userLocation, radiusMiles = 15 }) {
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

      const points = weekendSales
        .filter((listing) => distanceMiles(center.lat, center.lng, listing.lat, listing.lng) <= radiusMiles)
        .map((listing) => ({ ...listing, lat: listing.lat, lng: listing.lng }));

      const clusters = clusterPoints(points, map, 58);
      clusters.forEach((cluster) => {
        const size = getBubbleSize(cluster.count);
        const icon = L.divIcon({
          className: "yardit-upcoming-weekend-cluster",
          html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#2C4F4E;border:3px solid #F4A849;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:${cluster.count >= 100 ? 12 : 14}px;box-shadow:0 3px 10px rgba(0,0,0,.30);cursor:pointer;">${cluster.count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([cluster.lat, cluster.lng], { icon, interactive: true, zIndexOffset: 9000 });
        marker.bindTooltip(`${cluster.count} upcoming ${cluster.count === 1 ? "sale" : "sales"} this weekend`, {
          direction: "top",
          offset: [0, -Math.round(size / 2)],
        });
        marker.on("click", () => {
          if (cluster.count > 1) {
            map.flyTo([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, 18), { duration: 0.45 });
            return;
          }

          const listing = cluster.points[0];
          const label = listing?.title || listing?.display_address || listing?.addressText || "Upcoming yard sale";
          marker.bindPopup(`<div style="font-weight:700;color:#2C4F4E;">${String(label).replace(/[<>]/g, "")}</div><div style="font-size:12px;margin-top:3px;color:#64748b;">Upcoming this weekend</div>`).openPopup();
        });
        layerRef.current.addLayer(marker);
      });
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