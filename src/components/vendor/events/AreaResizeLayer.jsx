import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { useMapRepaint } from "./useMapRepaint";

const HANDLE_HIT = 26; // hit area (px) for touch friendliness
const HANDLE_DOT = 13; // visible dot size (px)
const MIN_RADIUS = 5;

function handlesFor(shape) {
  if (!shape) return [];
  if (shape.type === "circle") return ["r"];
  if (shape.type === "rectangle") return ["nw", "ne", "sw", "se"];
  if (shape.type === "triangle") return ["0", "1", "2"];
  return [];
}

function handleLatLngFromShape(map, shape, handleId) {
  if (shape.type === "circle") {
    const c = map.latLngToContainerPoint(shape.center);
    const dLng = (shape.radius || 0) / (111320 * Math.cos((shape.center[0] * Math.PI) / 180));
    const east = map.latLngToContainerPoint([shape.center[0], shape.center[1] + dLng]);
    return { x: east.x, y: c.y };
  }
  if (shape.type === "rectangle") {
    const b = shape.bounds;
    const corners = {
      nw: [b[1][0], b[0][1]],
      ne: [b[1][0], b[1][1]],
      sw: [b[0][0], b[0][1]],
      se: [b[0][0], b[1][1]],
    };
    const p = map.latLngToContainerPoint(corners[handleId]);
    return { x: p.x, y: p.y };
  }
  if (shape.type === "triangle") {
    const idx = parseInt(handleId, 10);
    const p = map.latLngToContainerPoint(shape.points[idx]);
    return { x: p.x, y: p.y };
  }
  return null;
}

function oppositeCorner(bounds, handleId) {
  const [sw, ne] = bounds;
  return {
    nw: [sw[0], ne[1]],
    ne: [sw[0], sw[1]],
    sw: [ne[0], ne[1]],
    se: [ne[0], sw[1]],
  }[handleId];
}

function computePatch(map, shape, handleId, latLng) {
  if (shape.type === "circle") {
    const r = map.distance(shape.center, [latLng.lat, latLng.lng]);
    return { radius: Math.max(MIN_RADIUS, r) };
  }
  if (shape.type === "rectangle") {
    const opp = oppositeCorner(shape.bounds, handleId);
    const minLat = Math.min(opp[0], latLng.lat);
    const maxLat = Math.max(opp[0], latLng.lat);
    const minLng = Math.min(opp[1], latLng.lng);
    const maxLng = Math.max(opp[1], latLng.lng);
    return { bounds: [[minLat, minLng], [maxLat, maxLng]] };
  }
  if (shape.type === "triangle") {
    const idx = parseInt(handleId, 10);
    return { points: shape.points.map((p, i) => (i === idx ? [latLng.lat, latLng.lng] : p)) };
  }
  return null;
}

// Renders draggable resize handles over the selected shape and reports live
// geometry patches via onResize. Uses unified pointer events so mouse, touch
// and stylus all work. Map dragging is suppressed while a handle is dragged.
export default function AreaResizeLayer({ shape, onResize }) {
  const map = useMap();
  const container = map.getContainer();
  useMapRepaint();

  const [dragId, setDragId] = useState(null);
  const [dragPx, setDragPx] = useState(null);
  const shapeRef = useRef(shape);
  shapeRef.current = shape;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    if (!dragId) return;
    const rect = () => container.getBoundingClientRect();

    const onMove = (e) => {
      const px = { x: e.clientX - rect().left, y: e.clientY - rect().top };
      setDragPx(px);
      const ll = map.containerPointToLatLng([px.x, px.y]);
      const patch = computePatch(map, shapeRef.current, dragId, ll);
      if (patch) onResizeRef.current(patch);
    };
    const onUp = () => {
      setDragId(null);
      setDragPx(null);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragId, map, container]);

  const onDown = (handleId, e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    setDragPx({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragId(handleId);
  };

  const handleIds = handlesFor(shape);
  if (!handleIds.length) return null;

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-[750]">
      {handleIds.map((hid) => {
        const px = dragId === hid && dragPx ? dragPx : handleLatLngFromShape(map, shape, hid);
        if (!px) return null;
        return (
          <div
            key={hid}
            onPointerDown={(e) => onDown(hid, e)}
            className="pointer-events-auto absolute flex items-center justify-center"
            style={{
              left: px.x,
              top: px.y,
              width: HANDLE_HIT,
              height: HANDLE_HIT,
              transform: "translate(-50%, -50%)",
              touchAction: "none",
              cursor: "grab",
            }}
          >
            <div
              style={{
                width: HANDLE_DOT,
                height: HANDLE_DOT,
                borderRadius: 9999,
                background: "#ffffff",
                border: "3px solid #2C4F4E",
                boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
              }}
            />
          </div>
        );
      })}
    </div>,
    container
  );
}