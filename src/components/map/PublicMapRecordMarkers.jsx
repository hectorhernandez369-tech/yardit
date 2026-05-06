import React, { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicRecordLat, getPublicRecordLng, getPublicRecordPriority } from "@/lib/publicMapRecords";

const iconCache = {};

function getRecordImage(record) {
  return record.event_icon || record.icon_url || record.icon || record.logo_url || null;
}

function isImageUrl(value) {
  return typeof value === "string" && /^(https?:|data:image\/)/i.test(value);
}

function getAnimationClass(record) {
  if (!record.animation_enabled && record.animation?.enabled !== true) return "";
  const type = record.animation_type || record.pin_animation || record.animation?.type || "none";
  if (type === "pulse") return " yanim-pulse";
  if (type === "bounce") return " yanim-bounce";
  return "";
}

function createPublicRecordIcon(record, zoom) {
  const image = getRecordImage(record);
  const animationClass = getAnimationClass(record);
  const tier = record.event_tier || record.tier || "starter";
  const size = Math.max(30, Math.min(46, Math.round((zoom || 13) * 2.6)));
  const cacheKey = `${record.id}_${image || "default"}_${animationClass}_${tier}_${size}`;

  if (!iconCache[cacheKey]) {
    const border = tier === "growth" ? "#F4A849" : tier === "pro" ? "#5DADA5" : "#2C4F4E";
    const content = isImageUrl(image)
      ? `<img src="${image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" />`
      : `<span style="font-size:${Math.round(size * 0.52)}px;line-height:1;">${image || "📍"}</span>`;

    iconCache[cacheKey] = L.divIcon({
      className: "public-map-record-marker",
      html: `<div class="public-map-pin${animationClass}" style="width:${size}px;height:${size}px;border:3px solid ${border};">${content}</div><div class="public-map-pin-tail" style="border-top-color:${border};"></div>`,
      iconSize: [size, size + 10],
      iconAnchor: [size / 2, size + 8],
      popupAnchor: [0, -(size + 4)],
    });
  }

  return iconCache[cacheKey];
}

function formatEnd(record) {
  const value = record.checkin_end_time || record.end_datetime || record.end_date;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PublicMapRecordMarkers({ records, zoom }) {
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => getPublicRecordPriority(a) - getPublicRecordPriority(b));
  }, [records]);

  return (
    <>
      {sortedRecords.map((record) => {
        const lat = getPublicRecordLat(record);
        const lng = getPublicRecordLng(record);
        if (lat === null || lng === null) return null;

        const image = getRecordImage(record);
        const endLabel = formatEnd(record);
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        return (
          <Marker
            key={`public-${record.id}`}
            position={[lat, lng]}
            icon={createPublicRecordIcon(record, zoom)}
            zIndexOffset={getPublicRecordPriority(record)}
          >
            <Popup maxWidth={300} minWidth={220}>
              <div className="space-y-2 p-0.5">
                <div className="flex items-start gap-2">
                  {image && isImageUrl(image) && (
                    <img src={image} alt="" className="w-10 h-10 rounded-full object-cover border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm leading-tight">{record.title || "Yardit Location"}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge className="text-[9px] h-4 px-1 capitalize bg-[#5DADA5] text-white">{record.type === "event" ? "Event" : "Vendor"}</Badge>
                      {(record.event_tier || record.tier) && <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{record.event_tier || record.tier}</Badge>}
                    </div>
                  </div>
                </div>
                {record.description && <p className="text-xs text-slate-600 leading-relaxed">{record.description}</p>}
                {record.display_address && <p className="text-xs text-slate-700 font-medium">{record.display_address}</p>}
                {endLabel && <p className="text-[11px] text-slate-500">{record.type === "event" ? "Ends" : "Live until"}: {endLabel}</p>}
                <Button size="sm" className="w-full h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => window.open(directionsUrl, "_blank", "noopener,noreferrer")}>
                  Get Directions
                </Button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}