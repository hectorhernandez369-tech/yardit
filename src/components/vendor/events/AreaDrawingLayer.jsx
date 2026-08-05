import { useEffect, useRef, useState } from "react";
import { Circle, Polygon, Rectangle, useMap, useMapEvents } from "react-leaflet";
import AreaShapeViews from "./AreaShapeViews";

const DRAFT_STYLE = { color: "#F4A849", fillColor: "#F4A849", fillOpacity: 0.12, weight: 2, dashArray: "6 5" };

const DEFAULT_SHAPE_STYLE = {
  title: "",
  fillColor: "#F4A849",
  fillOpacity: 0.2,
  lineColor: "#F4A849",
  lineOpacity: 0.9,
};

const HANDLERS = ["dragging", "touchZoom", "doubleClickZoom", "scrollWheelZoom", "boxZoom", "keyboard"];

export default function AreaDrawingLayer({ drawingMode, shapes, onAddShape, onFinishDrawing, onRejectShape }) {
  const map = useMap();
  const [draft, setDraft] = useState(null);
  const [vertices, setVertices] = useState([]);
  const draftRef = useRef(null);
  const verticesRef = useRef([]);
  const prevStateRef = useRef({});
  const modeRef = useRef(drawingMode);
  modeRef.current = drawingMode;

  const cbRef = useRef({ onAddShape, onFinishDrawing, onRejectShape });
  cbRef.current = { onAddShape, onFinishDrawing, onRejectShape };

  const setDraftBoth = (d) => { draftRef.current = d; setDraft(d); };
  const setVerticesBoth = (v) => { verticesRef.current = v; setVertices(v); };

  const finishDraft = () => {
    const d = draftRef.current;
    if (!d) return;
    if (d.type === "circle") {
      if (d.radius < 8) {
        cbRef.current.onRejectShape?.("Circle too small — try drawing a larger area.");
        setDraftBoth(null);
        return;
      }
      cbRef.current.onAddShape?.({ type: "circle", center: d.center, radius: d.radius, ...DEFAULT_SHAPE_STYLE });
    } else if (d.type === "rectangle") {
      const w = Math.abs(d.corner2[1] - d.corner1[1]);
      const h = Math.abs(d.corner2[0] - d.corner1[0]);
      if (w < 0.00005 || h < 0.00005) {
        cbRef.current.onRejectShape?.("Rectangle too small — try drawing a larger area.");
        setDraftBoth(null);
        return;
      }
      const sw = [Math.min(d.corner1[0], d.corner2[0]), Math.min(d.corner1[1], d.corner2[1])];
      const ne = [Math.max(d.corner1[0], d.corner2[0]), Math.max(d.corner1[1], d.corner2[1])];
      cbRef.current.onAddShape?.({ type: "rectangle", bounds: [sw, ne], ...DEFAULT_SHAPE_STYLE });
    }
    setDraftBoth(null);
    cbRef.current.onFinishDrawing?.();
  };

  // Lock/unlock all map navigation handlers while drawing. Restore prior state on exit/unmount.
  useEffect(() => {
    const restore = () => {
      HANDLERS.forEach((h) => {
        const handler = map[h];
        if (handler && typeof handler.enable === "function" && prevStateRef.current[h] !== false) {
          handler.enable();
        }
      });
      try { map.getContainer().style.touchAction = ""; } catch { /* noop */ }
    };

    if (drawingMode !== "none") {
      const prev = {};
      HANDLERS.forEach((h) => {
        const handler = map[h];
        if (handler && typeof handler.enabled === "function") {
          prev[h] = handler.enabled();
          handler.disable();
        }
      });
      try { map.getContainer().style.touchAction = "none"; } catch { /* noop */ }
      prevStateRef.current = prev;
    } else {
      restore();
      setDraftBoth(null);
      setVerticesBoth([]);
    }
    return () => restore();
  }, [drawingMode, map]);

  // Pointer-based drawing (unified mouse + touch + pen) for circle & rectangle.
  useEffect(() => {
    if (drawingMode !== "circle" && drawingMode !== "rectangle") return;
    const container = map.getContainer();
    if (!container) return;

    const getLatLng = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return map.containerPointToLatLng([x, y]);
    };

    const onDown = (e) => {
      // Ignore clicks on Leaflet controls (zoom +/-, layers, etc.)
      if (e.target && e.target.closest && e.target.closest(".leaflet-control")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try { e.preventDefault(); } catch { /* noop */ }
      const ll = getLatLng(e);
      if (drawingMode === "circle") setDraftBoth({ type: "circle", center: [ll.lat, ll.lng], radius: 15 });
      else setDraftBoth({ type: "rectangle", corner1: [ll.lat, ll.lng], corner2: [ll.lat, ll.lng] });
    };
    const onMove = (e) => {
      const d = draftRef.current;
      if (!d) return;
      try { e.preventDefault(); } catch { /* noop */ }
      const ll = getLatLng(e);
      if (d.type === "circle") setDraftBoth({ ...d, radius: map.distance(d.center, [ll.lat, ll.lng]) });
      else setDraftBoth({ ...d, corner2: [ll.lat, ll.lng] });
    };
    const onUp = () => finishDraft();

    container.addEventListener("pointerdown", onDown);
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerup", onUp);
    container.addEventListener("pointercancel", onUp);
    container.addEventListener("pointerleave", onUp);
    return () => {
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerup", onUp);
      container.removeEventListener("pointercancel", onUp);
      container.removeEventListener("pointerleave", onUp);
    };
  }, [drawingMode, map]);

  // Triangle: three taps (click works for mouse + touch)
  useMapEvents({
    click(e) {
      if (modeRef.current !== "triangle") return;
      const pts = [...verticesRef.current, [e.latlng.lat, e.latlng.lng]];
      if (pts.length === 3) {
        cbRef.current.onAddShape?.({ type: "triangle", points: pts, ...DEFAULT_SHAPE_STYLE });
        setVerticesBoth([]);
        cbRef.current.onFinishDrawing?.();
      } else {
        setVerticesBoth(pts);
      }
    },
  });

  return (
    <>
      {draft?.type === "circle" && <Circle center={draft.center} radius={draft.radius} pathOptions={DRAFT_STYLE} />}
      {draft?.type === "rectangle" && <Rectangle bounds={[draft.corner1, draft.corner2]} pathOptions={DRAFT_STYLE} />}
      {vertices.length > 0 && drawingMode === "triangle" && <Polygon positions={vertices} pathOptions={DRAFT_STYLE} />}
      <AreaShapeViews shapes={shapes} />
    </>
  );
}