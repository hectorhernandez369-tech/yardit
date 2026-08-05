import { useEffect } from "react";
import { Circle, MapContainer, Polygon, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VendorEventMapboxTileLayer from "@/components/vendor/events/VendorEventMapboxTileLayer";
import { rectCorners, fitBoundsFromObjects, serviceIconGlyph } from "@/lib/leagueEventMapGeometry";
import { formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";
import { fieldStatusForNow, gamesOnField } from "@/lib/leagueFieldConflict";

const labelIcon = (text, size = "md", color = "#2C4F4E") => {
  const px = size === "lg" ? 18 : size === "sm" ? 12 : 15;
  const html = `<div style="white-space:nowrap;background:rgba(255,255,255,.92);border:1px solid ${color}22;border-radius:9999px;padding:2px 8px;font-size:${px}px;font-weight:800;color:${color};box-shadow:0 2px 6px rgba(0,0,0,.18);">${text}</div>`;
  return L.divIcon({ className: "league-event-label-marker", html, iconSize: [120, 24], iconAnchor: [60, 12] });
};

const serviceIcon = (glyph) => L.divIcon({
  className: "league-service-marker",
  html: `<div style="width:34px;height:34px;border-radius:9999px;background:#fff;border:2px solid #2C4F4E;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 8px rgba(0,0,0,.25);">${glyph}</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17],
});

function FitController({ fields, objects, defaultView }) {
  const map = useMap();
  useEffect(() => {
    const bounds = fitBoundsFromObjects(fields, objects);
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    else if (defaultView?.center) map.setView(defaultView.center, defaultView.zoom || 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function FocusField({ fieldId, fields }) {
  const map = useMap();
  useEffect(() => {
    if (!fieldId) return;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const lat = field.latitude || field.geometry?.center?.[0];
    const lng = field.longitude || field.geometry?.center?.[1];
    if (lat && lng) map.setView([lat, lng], Math.max(map.getZoom(), 18), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);
  return null;
}

const STATUS_RING = {
  upcoming: { color: "#94a3b8" },
  in_progress: { color: "#10b981" },
  between_games: { color: "#f59e0b" },
  finished: { color: "#cbd5e1" },
  closed: { color: "#ef4444" },
};

// Public, non-editable attendee venue map. Fields render as shapes with live game labels.
export default function PublicLeagueEventMap({ event, fields = [], publishedObjects = [], games = [], selectedFieldId, onSelectField, highlightFieldId }) {
  const center = [event.latitude, event.longitude];
  const sortedFields = [...fields].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const visibleObjects = (publishedObjects || []).filter((o) => !o.hidden);

  return (
    <div className="h-[360px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20 sm:h-[460px]">
      <MapContainer center={center} zoom={16} className="h-full w-full" scrollWheelZoom={false}>
        <VendorEventMapboxTileLayer />
        <FitController fields={sortedFields} objects={visibleObjects} defaultView={event.default_view} />
        <FocusField fieldId={highlightFieldId} fields={sortedFields} />

        {sortedFields.map((field) => {
          const geom = field.geometry;
          if (!geom) return null;
          const status = fieldStatusForNow(field, games);
          const ring = STATUS_RING[status] || STATUS_RING.upcoming;
          const isHighlight = highlightFieldId === field.id;
          const fieldGames = sortLeagueGames(gamesOnField(field.id, games));
          const next = fieldGames.find((g) => new Date(g.start_time).getTime() >= Date.now()) || fieldGames[fieldGames.length - 1];
          const ringColor = isHighlight ? "#F4A849" : ring.color;
          const fillOpacity = isHighlight ? 0.35 : 0.18;
          const label = `${field.name}${next ? ` · ${formatGameTime(next.start_time)} ${next.home_team || ""} vs ${next.away_team || ""}` : ""}`;
          if (geom.type === "rectangle") {
            return (
              <Polygon key={field.id} positions={rectCorners(geom)} pathOptions={{ color: ringColor, fillColor: ringColor, fillOpacity, weight: isHighlight ? 4 : 2 }} eventHandlers={{ click: () => onSelectField?.(field) }}>
              </Polygon>
            );
          }
          return <Circle key={field.id} center={geom.center} radius={geom.radiusM || 30} pathOptions={{ color: ringColor, fillColor: ringColor, fillOpacity, weight: isHighlight ? 4 : 2 }} eventHandlers={{ click: () => onSelectField?.(field) }} />;
        })}

        {sortedFields.map((field) => (
          <Marker key={`l-${field.id}`} position={[field.latitude || field.geometry?.center?.[0], field.longitude || field.geometry?.center?.[1]]} icon={labelIcon(field.name, field.text_size, "#2C4F4E")} eventHandlers={{ click: () => onSelectField?.(field) }} />
        ))}

        {visibleObjects.map((o) => {
          if (o.type === "icon" && o.geometry?.position) {
            return <Marker key={o.id} position={o.geometry.position} icon={serviceIcon(serviceIconGlyph(o.icon_key))} />;
          }
          if (o.type === "label" && o.geometry?.position) {
            return <Marker key={o.id} position={o.geometry.position} icon={labelIcon(o.title || "Label", o.style?.size || "md")} />;
          }
          if ((o.type === "area" || o.type === "entrance") && o.geometry?.type === "rectangle") {
            return <Polygon key={o.id} positions={rectCorners(o.geometry)} pathOptions={{ color: o.style?.borderColor || "#2C4F4E", fillColor: o.style?.fillColor || "#5DADA5", fillOpacity: o.style?.fillOpacity ?? 0.2, weight: o.style?.borderWidth || 2 }} />;
          }
          if ((o.type === "area" || o.type === "entrance") && o.geometry?.type === "circle") {
            return <Circle key={o.id} center={o.geometry.center} radius={o.geometry.radiusM || 30} pathOptions={{ color: o.style?.borderColor || "#2C4F4E", fillColor: o.style?.fillColor || "#5DADA5", fillOpacity: o.style?.fillOpacity ?? 0.2, weight: o.style?.borderWidth || 2 }} />;
          }
          if (o.type === "route" && o.geometry?.points?.length >= 2) {
            return <Polygon key={o.id} positions={o.geometry.points} pathOptions={{ color: o.style?.borderColor || "#F4A849", fill: false, weight: o.style?.borderWidth || 4, dashArray: "8 6" }} />;
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
}