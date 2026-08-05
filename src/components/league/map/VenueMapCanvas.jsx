import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VendorEventMapboxTileLayer from "@/components/vendor/events/VendorEventMapboxTileLayer";
import { rectCorners, fitBoundsFromObjects, defaultFieldGeometry, defaultAreaGeometry, uid, serviceIconGlyph } from "@/lib/leagueEventMapGeometry";
import { fieldStatusForNow, gamesOnField } from "@/lib/leagueFieldConflict";
import { formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";

const labelIcon = (text, size = "md", color = "#2C4F4E", selected = false) => {
  const px = size === "lg" ? 17 : size === "sm" ? 12 : 14;
  return L.divIcon({
    className: "league-event-label-marker",
    html: `<div style="white-space:nowrap;background:${selected ? "#F4A849" : "rgba(255,255,255,.95)"};border:2px solid ${selected ? "#2C4F4E" : color + "33"};border-radius:9999px;padding:2px 8px;font-size:${px}px;font-weight:800;color:${selected ? "#2C4F4E" : color};box-shadow:0 2px 6px rgba(0,0,0,.18);">${text}</div>`,
    iconSize: [160, 26], iconAnchor: [80, 13],
  });
};

const serviceIcon = (glyph, selected) => L.divIcon({
  className: "league-service-marker",
  html: `<div style="width:${selected ? 40 : 34}px;height:${selected ? 40 : 34}px;border-radius:9999px;background:${selected ? "#F4A849" : "#fff"};border:2px solid #2C4F4E;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 8px rgba(0,0,0,.25);">${glyph}</div>`,
  iconSize: [selected ? 40 : 34, selected ? 40 : 34], iconAnchor: [selected ? 20 : 17, selected ? 20 : 17],
});

const entranceIcon = (subtype, arrowDeg, selected) => L.divIcon({
  className: "league-entrance-marker",
  html: `<div style="transform:rotate(${arrowDeg || 0}deg);display:flex;align-items:center;gap:4px;"><div style="width:${selected ? 40 : 32}px;height:${selected ? 40 : 32}px;border-radius:9999px;background:${selected ? "#F4A849" : "#5DADA5"};border:2px solid #2C4F4E;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,.25);">↗</div></div>`,
  iconSize: [selected ? 40 : 32, selected ? 40 : 32], iconAnchor: [selected ? 20 : 16, selected ? 20 : 16],
});

function FitController({ fields, objects, defaultView, mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
    const bounds = fitBoundsFromObjects(fields, objects);
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    else if (defaultView?.center) map.setView(defaultView.center, defaultView.zoom || 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function CreationHandler({ activeTool, onAddField, onAddObject, onDone, draftRoute, setDraftRoute }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      if (activeTool === "field") { onAddField([lat, lng]); onDone(); }
      else if (activeTool === "area") { onAddObject({ id: uid(), type: "area", subtype: "Vendor Area", title: "New Area", geometry: defaultAreaGeometry([lat, lng]), style: { fillColor: "#5DADA5", borderColor: "#2C4F4E", fillOpacity: 0.2, borderWidth: 2 }, display_order: 0 }); onDone(); }
      else if (activeTool === "entrance") { onAddObject({ id: uid(), type: "entrance", subtype: "Spectator Entrance", title: "Spectator Entrance", geometry: { position: [lat, lng] }, style: { arrowDeg: 0 } }); onDone(); }
      else if (activeTool === "label") { onAddObject({ id: uid(), type: "label", title: "New Label", geometry: { position: [lat, lng] }, style: { size: "md" } }); onDone(); }
      else if (activeTool === "icon") { onAddObject({ id: uid(), type: "icon", icon_key: "restroom", title: "Restroom", geometry: { position: [lat, lng] } }); onDone(); }
      else if (activeTool === "route") { setDraftRoute([...draftRoute, [lat, lng]]); }
    },
  });
  return null;
}

// Interactive venue map for the League Event Map Workstation (design + schedule views).
export default function VenueMapCanvas({ event, fields = [], objects = [], activeTool, setActiveTool, selectedId, selectedType, onSelect, onAddField, onAddObject, onUpdateField, onUpdateObject, view = "design", games = [], onSelectField, mapRef }) {
  const [draftRoute, setDraftRoute] = useState([]);

  const visibleObjects = objects.filter((o) => !o.hidden);
  const isCreating = ["field", "area", "entrance", "label", "icon", "route"].includes(activeTool);

  const finishRoute = () => {
    if (draftRoute.length >= 2) {
      onAddObject({ id: uid(), type: "route", title: "Route", geometry: { points: draftRoute }, style: { borderColor: "#F4A849", borderWidth: 4 } });
    }
    setDraftRoute([]);
    setActiveTool("select");
  };

  const moveShape = (obj, type, newCenter) => {
    if (type === "field") onUpdateField(obj.id, { latitude: newCenter[0], longitude: newCenter[1], geometry: { ...obj.geometry, center: newCenter } });
    else onUpdateObject(obj.id, { geometry: { ...obj.geometry, center: newCenter } });
  };

  const centerOf = (o, type) => {
    const g = o.geometry;
    if (g?.center) return g.center;
    if (g?.position) return g.position;
    if (g?.type === "rectangle") return g.center;
    return [event.latitude, event.longitude];
  };

  const renderField = (field) => {
    const geom = field.geometry;
    if (!geom) return null;
    const selected = selectedType === "field" && selectedId === field.id;
    const isSchedule = view === "schedule";
    let color = field.border_color || "#2C4F4E";
    let fillOpacity = field.fill_opacity ?? 0.25;
    if (isSchedule) {
      const status = fieldStatusForNow(field, games);
      color = status === "in_progress" ? "#10b981" : status === "between_games" ? "#f59e0b" : status === "finished" ? "#cbd5e1" : "#94a3b8";
      fillOpacity = 0.3;
    }
    const pathOpts = { color: selected ? "#F4A849" : color, fillColor: field.fill_color || "#5DADA5", fillOpacity, weight: selected ? 4 : (field.border_width || 2) };
    const onClick = () => (isSchedule ? onSelectField?.(field) : onSelect(field.id, "field"));
    if (geom.type === "rectangle") return <Polygon key={field.id} positions={rectCorners(geom)} pathOptions={pathOpts} eventHandlers={{ click: onClick }} />;
    return <Circle key={field.id} center={geom.center} radius={geom.radiusM || 30} pathOptions={pathOpts} eventHandlers={{ click: onClick }} />;
  };

  const renderObject = (o) => {
    const selected = selectedType === o.type && selectedId === o.id;
    const g = o.geometry;
    if (o.type === "icon" && g?.position) return <Marker key={o.id} position={g.position} icon={serviceIcon(serviceIconGlyph(o.icon_key), selected)} eventHandlers={{ click: () => onSelect(o.id, o.type) }} />;
    if (o.type === "label" && g?.position) return <Marker key={o.id} position={g.position} icon={labelIcon(o.title || "Label", o.style?.size || "md", "#2C4F4E", selected)} eventHandlers={{ click: () => onSelect(o.id, o.type) }} />;
    if (o.type === "entrance" && g?.position) return <Marker key={o.id} position={g.position} icon={entranceIcon(o.subtype, o.style?.arrowDeg, selected)} eventHandlers={{ click: () => onSelect(o.id, o.type) }} />;
    if ((o.type === "area") && g?.type === "rectangle") return <Polygon key={o.id} positions={rectCorners(g)} pathOptions={{ color: selected ? "#F4A849" : (o.style?.borderColor || "#2C4F4E"), fillColor: o.style?.fillColor || "#5DADA5", fillOpacity: o.style?.fillOpacity ?? 0.2, weight: selected ? 4 : (o.style?.borderWidth || 2) }} eventHandlers={{ click: () => onSelect(o.id, o.type) }} />;
    if ((o.type === "area") && g?.type === "circle") return <Circle key={o.id} center={g.center} radius={g.radiusM || 30} pathOptions={{ color: selected ? "#F4A849" : (o.style?.borderColor || "#2C4F4E"), fillColor: o.style?.fillColor || "#5DADA5", fillOpacity: o.style?.fillOpacity ?? 0.2, weight: selected ? 4 : (o.style?.borderWidth || 2) }} eventHandlers={{ click: () => onSelect(o.id, o.type) }} />;
    if (o.type === "route") {
      if (g?.points?.length >= 2) return <Polygon key={o.id} positions={g.points} pathOptions={{ color: selected ? "#F4A849" : (o.style?.borderColor || "#F4A849"), fill: false, weight: o.style?.borderWidth || 4, dashArray: "8 6" }} eventHandlers={{ click: () => onSelect(o.id, o.type) }} />;
      return null;
    }
    return null;
  };

  // Draggable center markers for moving selected shapes (design view only).
  const renderMoveHandles = () => {
    if (view !== "design" || isCreating) return null;
    const handles = [];
    fields.forEach((f) => {
      if (selectedType === "field" && selectedId === f.id && f.geometry?.center) {
        handles.push(<Marker key={`m-${f.id}`} position={f.geometry.center} draggable icon={L.divIcon({ className: "league-move-handle", html: '<div style="width:14px;height:14px;border-radius:9999px;background:#F4A849;border:2px solid #2C4F4E;cursor:move;"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })}
          eventHandlers={{ dragend: (e) => { const c = e.target.getLatLng(); moveShape(f, "field", [c.lat, c.lng]); } }} />);
      }
    });
    objects.forEach((o) => {
      if (selectedType === o.type && selectedId === o.id && !o.locked) {
        const c = centerOf(o, o.type);
        if (o.geometry?.center || o.geometry?.position) {
          handles.push(<Marker key={`m-${o.id}`} position={c} draggable icon={L.divIcon({ className: "league-move-handle", html: '<div style="width:12px;height:12px;border-radius:9999px;background:#F4A849;border:2px solid #2C4F4E;cursor:move;"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })}
            eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); if (o.geometry?.center) moveShape(o, o.type, [ll.lat, ll.lng]); else onUpdateObject(o.id, { geometry: { ...o.geometry, position: [ll.lat, ll.lng] } }); } }} />);
        }
      }
    });
    return handles;
  };

  // Field labels (always) — in schedule view show current/next game.
  const renderFieldLabels = () =>
    [...fields].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((f) => {
      const isSchedule = view === "schedule";
      let text = f.name + (f.field_number ? ` #${f.field_number}` : "");
      if (isSchedule) {
        const fg = sortLeagueGames(gamesOnField(f.id, games));
        const next = fg.find((g) => new Date(g.start_time).getTime() >= Date.now()) || fg[fg.length - 1];
        if (next) text = `${f.name} · ${formatGameTime(next.start_time)} ${next.home_team || ""} vs ${next.away_team || ""}`;
      }
      const pos = [f.latitude || f.geometry?.center?.[0], f.longitude || f.geometry?.center?.[1]];
      return <Marker key={`l-${f.id}`} position={pos} icon={labelIcon(text, f.text_size, "#2C4F4E", selectedType === "field" && selectedId === f.id)} eventHandlers={{ click: () => (isSchedule ? onSelectField?.(f) : onSelect(f.id, "field")) }} />;
    });

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[event.latitude, event.longitude]} zoom={16} zoomControl className="h-full w-full" style={{ cursor: isCreating ? "crosshair" : "default" }}>
        <VendorEventMapboxTileLayer />
        <FitController fields={fields} objects={visibleObjects} defaultView={event.default_view} mapRef={mapRef} />
        <CreationHandler activeTool={activeTool} onAddField={onAddField} onAddObject={onAddObject} onDone={() => setActiveTool("select")} draftRoute={draftRoute} setDraftRoute={setDraftRoute} />

        {fields.map(renderField)}
        {visibleObjects.map(renderObject)}
        {renderFieldLabels()}
        {renderMoveHandles()}

        {draftRoute.length >= 2 && <Polygon positions={draftRoute} pathOptions={{ color: "#F4A849", fill: false, weight: 4, dashArray: "8 6" }} />}
      </MapContainer>

      {activeTool === "route" && (
        <div className="pointer-events-auto absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-[#2C4F4E]/90 px-3 py-1.5 text-xs font-semibold text-white shadow">
          Tap points · {draftRoute.length} added · <button type="button" onClick={finishRoute} className="ml-1 rounded-full bg-[#F4A849] px-2 py-0.5 font-black text-[#2C4F4E]">Done</button>
          <button type="button" onClick={() => { setDraftRoute([]); setActiveTool("select"); }} className="ml-1 text-white/80">Cancel</button>
        </div>
      )}
    </div>
  );
}