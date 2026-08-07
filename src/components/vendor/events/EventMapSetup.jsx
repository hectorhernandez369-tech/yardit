import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, MapPin, Flag as FlagIcon, Trash2, Eye, Circle as CircleIcon, Square, Triangle as TriangleIcon } from "lucide-react";
import { calculateMiles } from "@/lib/vendorEvents";
import { isPointInShape, offsetShapeGeometry } from "@/lib/areaGeometry";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileShapeSheet from "./MobileShapeSheet";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";
import AreaDrawingLayer from "./AreaDrawingLayer";
import AreaShapeViews from "./AreaShapeViews";
import DraggableAreaShapes, { isShapeFullyVisible } from "./DraggableAreaShape";
import MapSetupHighlightEditor from "./MapSetupHighlightEditor";
import MapSetupFlagEditor from "./MapSetupFlagEditor";
import PublicVendorEventMap from "./PublicVendorEventMap";
import AreaLabelOverlay from "./AreaLabelOverlay";
import AreaSelectionToolbar from "./AreaSelectionToolbar";
import AreaResizeLayer from "./AreaResizeLayer";
import "leaflet/dist/leaflet.css";

const MAP_LOCK_HANDLERS = ["dragging", "touchZoom", "doubleClickZoom", "scrollWheelZoom", "boxZoom", "keyboard"];

function MapInteractionLock({ active }) {
  const map = useMap();
  const prevRef = useRef({});
  useEffect(() => {
    const restore = () => {
      MAP_LOCK_HANDLERS.forEach((h) => {
        const hd = map[h];
        if (hd && typeof hd.enable === "function" && prevRef.current[h] !== false) hd.enable();
      });
      try { map.getContainer().style.touchAction = ""; } catch { /* noop */ }
    };
    if (active) {
      const prev = {};
      MAP_LOCK_HANDLERS.forEach((h) => {
        const hd = map[h];
        if (hd && typeof hd.enabled === "function") {
          prev[h] = hd.enabled();
          hd.disable();
        }
      });
      try { map.getContainer().style.touchAction = "none"; } catch { /* noop */ }
      prevRef.current = prev;
    } else {
      restore();
    }
    return () => { if (active) restore(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, map]);
  return null;
}

function MapClickHandler({ active, onDeselect }) {
  const map = useMap();
  const stateRef = useRef({ active, onDeselect });
  stateRef.current = { active, onDeselect };
  useEffect(() => {
    const handler = (e) => {
      const s = stateRef.current;
      if (!s.active) return;
      // Ignore clicks that originate inside the floating toolbar or resize
      // handles (portaled into the map container) so Edit/Resize/Done/Cancel
      // don't also trigger a map deselect.
      const target = e?.originalEvent?.target;
      if (target && typeof target.closest === "function" && target.closest("[data-no-map-click]")) return;
      s.onDeselect();
    };
    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map]);
  return null;
}

const DRAW_HINTS = {
  circle: "Press and drag from the center outward.",
  rectangle: "Press and drag from one corner to the opposite corner.",
  triangle: "Tap three points.",
};

const makeFlagIcon = (flag, selected) => L.divIcon({
  className: "vendor-event-flag-marker",
  html: `<div style="display:flex;align-items:center;gap:4px;transform:translate(-2px,-28px);"><div style="width:${selected ? 32 : 24}px;height:${selected ? 32 : 24}px;border-radius:9999px;background:#F4A849;border:${selected ? 3 : 2}px solid #2C4F4E;display:flex;align-items:center;justify-content:center;font-size:${selected ? 17 : 13}px;box-shadow:0 3px 8px rgba(0,0,0,.28);">⚑</div><span style="white-space:nowrap;background:${selected ? "#FFF6E8" : "white"};border:1px solid #2C4F4E22;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:700;color:#2C4F4E;box-shadow:0 2px 6px rgba(0,0,0,.12);">${flag.title || flag.label || "Flag"}</span></div>`,
  iconSize: [selected ? 32 : 24, selected ? 32 : 24],
  iconAnchor: [selected ? 16 : 12, selected ? 32 : 24],
});

function areaCenter(shape) {
  if (shape.type === "circle") return shape.center;
  if (shape.type === "rectangle") {
    return [(shape.bounds[0][0] + shape.bounds[1][0]) / 2, (shape.bounds[0][1] + shape.bounds[1][1]) / 2];
  }
  if (shape.type === "triangle") {
    const pts = shape.points;
    return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  }
  return null;
}

function FitEventArea({ center, radiusMeters, showRadius }) {
  const map = useMap();
  useEffect(() => {
    if (showRadius && radiusMeters > 0) {
      const latOff = radiusMeters / 111320;
      const lngOff = radiusMeters / (111320 * Math.cos((center[0] * Math.PI) / 180));
      map.fitBounds([[center[0] - latOff, center[1] - lngOff], [center[0] + latOff, center[1] + lngOff]], { padding: [28, 28], maxZoom: 17 });
    } else {
      map.setView(center, 15);
    }
    const t = setTimeout(() => map.invalidateSize(), 140);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.setView([target.lat, target.lng], target.zoom || 16, { animate: true });
  }, [target]);
  return null;
}

function MapTapHandler({ active, eventLocation, onAddFlag }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      const { lat, lng } = e.latlng;
      if (eventLocation) {
        const miles = calculateMiles(eventLocation.latitude, eventLocation.longitude, lat, lng);
        const radiusMiles = Number(eventLocation.radius_feet || 0) / 5280;
        if (miles !== null && radiusMiles > 0 && miles > radiusMiles) {
          toast.error("Flags must be inside the event area.");
          return;
        }
      }
      onAddFlag(lat, lng);
    },
  });
  return null;
}

function MapReady({ onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}



export default function EventMapSetup({ open, onOpenChange, eventType, value, onChange }) {
  const showFlags = ["multi_spot", "multi_location"].includes(eventType);
  const center = [Number(value.latitude), Number(value.longitude)];
  const radiusMeters = Number(value.radius_feet || 500) * 0.3048;

  const [flags, setFlags] = useState(value.flags || []);
  const [highlights, setHighlights] = useState(value.highlights || []);
  const [mode, setMode] = useState("none"); // none | flag | circle | rectangle | triangle
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // { type:"flag"|"area", id }
  const [mapStyle, setMapStyle] = useState("standard");
  const [showPreview, setShowPreview] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [draggingAreaId, setDraggingAreaId] = useState(null);
  const [callout, setCallout] = useState({ id: null, shown: false });
  const mapRef = useRef(null);
  const calloutTimerRef = useRef(null);
  const isMobile = useIsMobile();
  const maybeFly = (target) => {
    if (!isMobile) setFlyTarget(target);
  };

  const clearCalloutTimer = () => {
    if (calloutTimerRef.current) { clearTimeout(calloutTimerRef.current); calloutTimerRef.current = null; }
  };
  const showCallout = (id) => {
    clearCalloutTimer();
    setCallout({ id, shown: true });
    calloutTimerRef.current = setTimeout(
      () => setCallout((c) => (c.id === id ? { id, shown: false } : c)),
      3000
    );
  };
  const pinCallout = (id) => { clearCalloutTimer(); setCallout({ id, shown: true }); };
  const hideCallout = () => { clearCalloutTimer(); setCallout({ id: null, shown: false }); };

  useEffect(() => {
    if (!open) return;
    setFlags(value.flags || []);
    setHighlights(value.highlights || []);
    setMode("none");
    setHighlightOpen(false);
    setSelectedId(null);
    setEditing(null);
    setMapStyle("standard");
    setShowPreview(false);
    setFlyTarget(null);
    setDraggingAreaId(null);
    clearCalloutTimer();
    setCallout({ id: null, shown: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const renumberFlags = (items) => items.map((f, i) => ({ ...f, label: `Field ${i + 1}`, display_order: i }));

  const addFlag = (lat, lng) => {
    const flag = {
      temp_id: `flag-${Date.now()}-${flags.length + 1}`,
      label: `Field ${flags.length + 1}`,
      title: `Field ${flags.length + 1}`,
      description: "",
      category: "",
      icon_key: "flag",
      schedule_entries: [],
      latitude: lat,
      longitude: lng,
      display_order: flags.length,
    };
    setFlags((prev) => renumberFlags([...prev, flag]));
    setSelectedId(flag.temp_id);
    setEditing({ type: "flag", id: flag.temp_id });
    setMode("none");
    maybeFly({ lat, lng, zoom: 17, ts: Date.now() });
  };

  const updateFlag = (id, patch) => setFlags((prev) => prev.map((f) => (f.temp_id === id || f.id === id ? { ...f, ...patch } : f)));
  const removeFlag = (id) => {
    setFlags((prev) => renumberFlags(prev.filter((f) => f.temp_id !== id && f.id !== id)));
    setEditing((cur) => (cur?.id === id ? null : cur));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const addHighlight = (shape) => {
    const id = `area_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item = { id, ...shape };
    setHighlights((prev) => [...prev, item]);
    setSelectedId(id);
    setEditing({ type: "area", id });
    pinCallout(id);
    const c = areaCenter(item);
    if (c) maybeFly({ lat: c[0], lng: c[1], zoom: 16, ts: Date.now() });
  };
  const updateHighlight = (id, patch) => setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const removeHighlight = (id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    setEditing((cur) => (cur?.id === id ? null : cur));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const duplicateSelectedShape = () => {
    if (!selectedShape) return;
    const dLat = 0.00025;
    const dLng = 0.00025;
    const newId = `area_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newShape = { ...selectedShape, id: newId, ...offsetShapeGeometry(selectedShape, dLat, dLng) };
    setHighlights((prev) => [...prev, newShape]);

    // Copy any flags that sit inside the original shape into the new shape,
    // offset by the same delta. renumberFlags assigns them the next sequential
    // Field numbers (they do NOT keep the original's number).
    const contained = flags.filter(
      (f) => isPointInShape(selectedShape, Number(f.latitude), Number(f.longitude))
    );
    if (contained.length) {
      const newFlags = contained.map((f) => ({
        temp_id: `flag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: "",
        title: "",
        description: f.description || "",
        category: f.category || "",
        icon_key: f.icon_key || "flag",
        schedule_entries: [],
        latitude: Number(f.latitude) + dLat,
        longitude: Number(f.longitude) + dLng,
        display_order: 0,
      }));
      setFlags((prev) => renumberFlags([...prev, ...newFlags]));
    }

    setSelectedId(newId);
    setEditing({ type: "area", id: newId });
    pinCallout(newId);
    const c = areaCenter(newShape);
    if (c) maybeFly({ lat: c[0], lng: c[1], zoom: 16, ts: Date.now() });
  };

  const selectFlag = (flag) => {
    const id = flag.temp_id || flag.id;
    setSelectedId(id);
    setEditing({ type: "flag", id });
    setFlyTarget({ lat: Number(flag.latitude), lng: Number(flag.longitude), zoom: 17, ts: Date.now() });
  };
  const selectArea = (shape) => {
    setSelectedId(shape.id);
    setEditing({ type: "area", id: shape.id });
    pinCallout(shape.id);

    const centerPoint = areaCenter(shape);
    if (centerPoint) {
      maybeFly({
        lat: centerPoint[0],
        lng: centerPoint[1],
        zoom: 16,
        ts: Date.now(),
      });
    }
  };

  const selectAreaFromMap = (shape) => {
    setSelectedId(shape.id);
    setEditing({ type: "area", id: shape.id });
    pinCallout(shape.id);

    const map = mapRef.current;
    const centerPoint = areaCenter(shape);

    if (!isMobile && centerPoint && (!map || !isShapeFullyVisible(map, shape))) {
      setFlyTarget({
        lat: centerPoint[0],
        lng: centerPoint[1],
        zoom: 16,
        ts: Date.now(),
      });
    }
  };

  const finishAreaSelection = () => {
    setSelectedId(null);
    setEditing(null);
    hideCallout();
  };

  const deselectAll = () => {
    setSelectedId(null);
    setEditing(null);
    hideCallout();
  };

  const editingAreaRef = useRef(null);
  useEffect(() => {
    if (isMobile) return;
    if (editing?.type === "area" && editingAreaRef.current) {
      try { editingAreaRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch { /* noop */ }
    }
  }, [editing, isMobile]);
  const onDragStart = (id) => setDraggingAreaId(id);
  const onDragMove = (id, patch) => updateHighlight(id, patch);
  const onDragEnd = (id, patch) => updateHighlight(id, patch);

  const drawingMode = mode === "flag" || mode === "none" ? "none" : mode;
  const selectedShape =
    highlights.find((highlight) => highlight.id === selectedId) || null;

  const calloutPinned =
    editing?.type === "area" && editing.id === selectedId;

  const calloutShown =
    (callout.shown || calloutPinned) &&
    callout.id === selectedId &&
    Boolean(selectedShape);

  const save = () => {
    onChange({ flags, highlights });
    onOpenChange(false);
  };

  const previewSpots = flags.map((f, i) => ({ ...f, id: f.id || f.temp_id || `flag-${i}` }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#2C4F4E]" /> Event Map Setup
            </DialogTitle>
            <p className="text-sm text-slate-500">Organize how attendees navigate your event. Add field flags and highlight key areas on the map.</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant={mapStyle === "standard" ? "default" : "outline"} onClick={() => setMapStyle("standard")}>Standard</Button>
              <Button size="sm" variant={mapStyle === "satellite" ? "default" : "outline"} onClick={() => setMapStyle("satellite")}>Satellite</Button>
            </div>

            {/* Large interactive map */}
            <div className="relative h-[58vh] md:h-[440px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
              <MapContainer center={center} zoom={15} className="h-full w-full" scrollWheelZoom>
                <VendorEventMapboxTileLayer mapStyle={mapStyle} />
                <MapReady onReady={(m) => { mapRef.current = m; }} />
                <FitEventArea center={center} radiusMeters={radiusMeters} showRadius={showFlags} />
                <FlyTo target={flyTarget} />
                <MapTapHandler
                  active={mode === "flag"}
                  eventLocation={{ latitude: value.latitude, longitude: value.longitude, radius_feet: value.radius_feet }}
                  onAddFlag={addFlag}
                />
                <MapClickHandler
                  active={mode === "none" && !selectedShape}
                  onDeselect={deselectAll}
                />
                <AreaDrawingLayer
                  drawingMode={drawingMode}
                  shapes={[]}
                  onAddShape={addHighlight}
                  onFinishDrawing={() => setMode("none")}
                  onRejectShape={(m) => toast.error(m)}
                />
                {showFlags && (
                  <Circle center={center} radius={radiusMeters} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.1, weight: 2 }} />
                )}
                <Marker position={center} />
                {drawingMode === "none" ? (
                  <DraggableAreaShapes
                    shapes={highlights}
                    selectedId={selectedId}
                    interactive={mode !== "flag"}
                    dragEnabled={mode !== "flag"}
                    onSelect={selectAreaFromMap}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                  />
                ) : (
                  <AreaShapeViews shapes={highlights} />
                )}

                {drawingMode === "none" && (
                  <AreaLabelOverlay
                    shapes={highlights}
                    calloutShape={selectedShape}
                    calloutShown={calloutShown}
                  />
                )}

                {drawingMode === "none" && selectedShape && (
                  <>
                    {!isMobile && (
                      <AreaSelectionToolbar
                        shape={selectedShape}
                        onDelete={() => removeHighlight(selectedShape.id)}
                        onDone={finishAreaSelection}
                        onAddFlag={
                          showFlags
                            ? () => {
                                const c = areaCenter(selectedShape);
                                if (c) addFlag(c[0], c[1]);
                              }
                            : undefined
                        }
                        onDuplicate={duplicateSelectedShape}
                      />
                    )}

                    <AreaResizeLayer
                      shape={selectedShape}
                      onResize={(patch) =>
                        updateHighlight(selectedShape.id, patch)
                      }
                    />
                  </>
                )}
                {flags.map((flag) => {
                  const id = flag.temp_id || flag.id;
                  const selected = selectedId === id;
                  return (
                    <Marker
                      key={id}
                      position={[Number(flag.latitude), Number(flag.longitude)]}
                      icon={makeFlagIcon(flag, selected)}
                      draggable={mode === "none" && !draggingAreaId}
                      bubblingMouseEvents={false}
                      eventHandlers={{
                        click: () => selectFlag(flag),
                        dragend: (ev) => {
                          const p = ev.target.getLatLng();
                          const miles = calculateMiles(value.latitude, value.longitude, p.lat, p.lng);
                          const radiusMiles = Number(value.radius_feet || 0) / 5280;
                          if (miles !== null && radiusMiles > 0 && miles > radiusMiles) {
                            toast.error("Flags must be inside the event area.");
                            ev.target.setLatLng([Number(flag.latitude), Number(flag.longitude)]);
                            return;
                          }
                          updateFlag(id, { latitude: p.lat, longitude: p.lng });
                        },
                      }}
                    />
                  );
                })}
              </MapContainer>

              {mode !== "none" && (
                <div className="pointer-events-none absolute left-1/2 top-2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2C4F4E]/90 px-3 py-1.5 text-white shadow-lg">
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {mode === "flag" ? "Tap the map to place a flag" : "Drawing mode active"}
                  </span>
                  <span className="hidden text-xs text-white/80 sm:inline">
                    — {mode === "flag" ? "Click to add, then edit details" : DRAW_HINTS[mode]}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setMode("none"); setHighlightOpen(false); }}
                    className="pointer-events-auto ml-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold hover:bg-white/25"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isMobile && selectedShape && editing?.type === "area" && editing.id === selectedShape.id && drawingMode === "none" && (
              <MobileShapeSheet
                shape={selectedShape}
                showAddFlag={showFlags}
                onAddFlag={() => {
                  const c = areaCenter(selectedShape);
                  if (c) addFlag(c[0], c[1]);
                }}
                onDuplicate={duplicateSelectedShape}
                onResize={() => toast.info("Drag the handles on the map to resize.")}
                onDelete={() => removeHighlight(selectedShape.id)}
                onDone={finishAreaSelection}
              />
            )}

            {/* Toolbar — all tools visible, no hidden layers */}
            <div className="flex flex-wrap max-md:flex-nowrap max-md:overflow-x-auto items-center gap-2 rounded-xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-2">
              {showFlags && (
                <Button
                  type="button"
                  variant={mode === "flag" ? "default" : "outline"}
                  onClick={() => setMode(mode === "flag" ? "none" : "flag")}
                  className="h-11 gap-2 font-semibold"
                >
                  <FlagIcon className="w-5 h-5" /> {mode === "flag" ? "Placing Flag" : "Add Flag"}
                </Button>
              )}
              <Button
                type="button"
                variant={mode === "circle" ? "default" : "outline"}
                onClick={() => setMode(mode === "circle" ? "none" : "circle")}
                className="h-11 gap-2 font-semibold"
                >
                <CircleIcon className="w-5 h-5" /> Circle
              </Button>
              <Button
                type="button"
                variant={mode === "rectangle" ? "default" : "outline"}
                onClick={() => setMode(mode === "rectangle" ? "none" : "rectangle")}
                className="h-11 gap-2 font-semibold"
                >
                <Square className="w-5 h-5" /> Rectangle
              </Button>
              <Button
                type="button"
                variant={mode === "triangle" ? "default" : "outline"}
                onClick={() => setMode(mode === "triangle" ? "none" : "triangle")}
                className="h-11 gap-2 font-semibold"
                >
                <TriangleIcon className="w-5 h-5" /> Triangle
              </Button>
              {mode !== "none" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setMode("none"); setHighlightOpen(false); }}
                  className="h-11 gap-2 ml-auto border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="w-5 h-5" /> Cancel Draw
                </Button>
              )}
            </div>

            {selectedShape &&
              editing?.type === "area" &&
              editing.id === selectedShape.id && (
                <div
                  ref={editingAreaRef}
                  className="rounded-xl border-2 border-[#5DADA5]/40 bg-white p-3 shadow-sm"
                >
                  <div className="mb-2">
                    <p className="text-sm font-bold text-[#2C4F4E]">
                      Selected Area
                    </p>
                    <p className="text-xs text-slate-500">
                      Drag the area to move it. Drag a visible handle to resize it.
                    </p>
                  </div>

                  <MapSetupHighlightEditor
                    shape={selectedShape}
                    onUpdate={(patch) =>
                      updateHighlight(selectedShape.id, patch)
                    }
                    onDelete={() => removeHighlight(selectedShape.id)}
                    onClose={finishAreaSelection}
                  />
                </div>
              )}

            {/* Items on Map */}
            <div className="space-y-4 rounded-xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3">
              {showFlags && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-[#2C4F4E] flex items-center gap-1.5">
                    <FlagIcon className="w-4 h-4" /> Flags
                    {flags.length > 0 && <span className="text-xs font-normal text-slate-500">({flags.length})</span>}
                  </p>
                  {flags.length === 0 ? (
                    <p className="text-xs text-slate-500 pl-6">No flags yet. Tap “Add Flag”, then click the map to place one.</p>
                  ) : (
                    flags.map((flag) => {
                      const id = flag.temp_id || flag.id;
                      const isEditing = editing?.type === "flag" && editing.id === id;
                      return (
                        <div key={id} className={`rounded-lg border bg-white p-2.5 ${selectedId === id ? "border-[#5DADA5] ring-1 ring-[#5DADA5]/40" : "border-[#2C4F4E]/10"}`}>
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 shrink-0 rounded-full bg-[#F4A849] border border-[#2C4F4E]/30 flex items-center justify-center text-[10px]">⚑</span>
                            <button type="button" onClick={() => selectFlag(flag)} className="flex-1 text-left text-sm font-semibold text-[#2C4F4E] truncate hover:underline">
                              {flag.title || flag.label || "Flag"}
                            </button>
                            <Button size="sm" variant="outline" onClick={() => setEditing({ type: "flag", id })} className="h-8 gap-1.5">Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => removeFlag(id)} className="h-8 gap-1.5 border-red-300 text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                          {isEditing && <MapSetupFlagEditor flag={flag} onUpdate={(p) => updateFlag(id, p)} onDelete={() => removeFlag(id)} onClose={() => setEditing(null)} />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className={showFlags ? "space-y-2 border-t border-[#2C4F4E]/10 pt-3" : "space-y-2"}>
                <p className="text-sm font-bold text-[#2C4F4E] flex items-center gap-1.5">
                  <CircleIcon className="w-4 h-4" /> Highlighted Areas
                  {highlights.length > 0 && <span className="text-xs font-normal text-slate-500">({highlights.length})</span>}
                </p>
                {highlights.length === 0 ? (
                  <p className="text-xs text-slate-500 pl-6">No areas yet. Tap Circle, Rectangle, or Triangle, then draw on the map.</p>
                ) : (
                  highlights.map((shape) => {
                    return (
                      <div
                        key={shape.id}
                        className={`rounded-lg border bg-white p-2.5 ${
                          selectedId === shape.id
                            ? "border-[#5DADA5] ring-1 ring-[#5DADA5]/40"
                            : "border-[#2C4F4E]/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-5 w-5 shrink-0 rounded-full border border-[#2C4F4E]/20"
                            style={{
                              backgroundColor:
                                shape.fillColor || "#F4A849",
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => selectArea(shape)}
                            className="flex-1 truncate text-left text-sm font-semibold text-[#2C4F4E] hover:underline"
                          >
                            {shape.title?.trim() || "Untitled Area"}
                          </button>

                          <span className="text-xs capitalize text-slate-500">
                            {shape.type}
                          </span>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeHighlight(shape.id)}
                            className="h-8 gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowPreview(true)} className="gap-2"><Eye className="w-4 h-4" /> Preview Public Map</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="button" onClick={save} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Save Map Setup</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Public Map Preview</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">This is exactly what attendees will see on the public event page.</p>
          <PublicVendorEventMap
            event={{ latitude: value.latitude, longitude: value.longitude, event_type: eventType, radius_feet: value.radius_feet, display_address: value.display_address }}
            spots={previewSpots}
            scheduleEntries={[]}
            selectedSpotId=""
          />
        </DialogContent>
      </Dialog>
    </>
  );
}