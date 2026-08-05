import { useEffect, useRef } from "react";
import { Circle, Polygon, Rectangle, Tooltip } from "react-leaflet";
import { getShapeStyle } from "./AreaShapeViews";

const MOVE_THRESHOLD_PX = 5;

function pathEl(layer) {
  return layer?._path || layer?._renderer?._path || null;
}

function containerLatLng(map, ev) {
  const rect = map.getContainer().getBoundingClientRect();
  return map.containerPointToLatLng([ev.clientX - rect.left, ev.clientY - rect.top]);
}

function shapeLatLngBounds(shape) {
  if (shape.type === "circle") {
    const r = shape.radius || 0;
    const dLat = r / 111320;
    const dLng = r / (111320 * Math.cos((shape.center[0] * Math.PI) / 180));
    return [shape.center[0] - dLat, shape.center[1] - dLng, shape.center[0] + dLat, shape.center[1] + dLng];
  }
  if (shape.type === "rectangle") {
    const b = shape.bounds;
    return [
      Math.min(b[0][0], b[1][0]),
      Math.min(b[0][1], b[1][1]),
      Math.max(b[0][0], b[1][0]),
      Math.max(b[0][1], b[1][1]),
    ];
  }
  if (shape.type === "triangle") {
    const pts = shape.points || [];
    if (!pts.length) return null;
    const lats = pts.map((p) => p[0]);
    const lngs = pts.map((p) => p[1]);
    return [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)];
  }
  return null;
}

export function isShapeFullyVisible(map, shape, margin = 24) {
  const b = shapeLatLngBounds(shape);
  if (!b) return true;
  const corners = [
    [b[0], b[1]],
    [b[0], b[3]],
    [b[2], b[1]],
    [b[2], b[3]],
  ];
  const size = map.getSize();
  for (const c of corners) {
    const p = map.latLngToContainerPoint(c);
    if (p.x < margin || p.y < margin || p.x > size.x - margin || p.y > size.y - margin) return false;
  }
  return true;
}

function moveGeometry(origShape, dLat, dLng) {
  if (origShape.type === "circle") {
    return { center: [origShape.center[0] + dLat, origShape.center[1] + dLng] };
  }
  if (origShape.type === "rectangle") {
    return {
      bounds: [
        [origShape.bounds[0][0] + dLat, origShape.bounds[0][1] + dLng],
        [origShape.bounds[1][0] + dLat, origShape.bounds[1][1] + dLng],
      ],
    };
  }
  if (origShape.type === "triangle") {
    return { points: origShape.points.map((p) => [p[0] + dLat, p[1] + dLng]) };
  }
  return {};
}

function DraggableShape({ shape, selected, interactive, onSelect, onDragStart, onDragMove, onDragEnd }) {
  const layerRef = useRef(null);
  const shapeRef = useRef(shape);
  shapeRef.current = shape;
  const cbRef = useRef({ onSelect, onDragStart, onDragMove, onDragEnd });
  cbRef.current = { onSelect, onDragStart, onDragMove, onDragEnd };
  const dragRef = useRef(null);

  // Attach pointer handlers once when the path is ready.
  useEffect(() => {
    if (!interactive) return;
    const layer = layerRef.current;
    if (!layer) return;
    const path = pathEl(layer);
    if (!path) return;

    const onPointerDown = (ev) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      ev.stopPropagation();
      ev.preventDefault();
      const map = layer._map;
      if (!map) return;
      const startLatLng = containerLatLng(map, ev);
      dragRef.current = {
        map,
        startX: ev.clientX,
        startY: ev.clientY,
        startLatLng,
        orig: JSON.parse(JSON.stringify(shapeRef.current)),
        moved: false,
        pointerId: ev.pointerId,
      };
      map.dragging.disable();
      try { path.style.touchAction = "none"; } catch { /* noop */ }
      cbRef.current.onSelect(shapeRef.current.id);
      cbRef.current.onDragStart(shapeRef.current.id);
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    const onPointerMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      ev.preventDefault();
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) d.moved = true;
      if (!d.moved) return;
      const cur = containerLatLng(d.map, ev);
      const dLat = cur.lat - d.startLatLng.lat;
      const dLng = cur.lng - d.startLatLng.lng;
      cbRef.current.onDragMove(shapeRef.current.id, moveGeometry(d.orig, dLat, dLng));
    };

    const onPointerUp = (ev) => {
      const d = dragRef.current;
      dragRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (!d) return;
      d.map.dragging.enable();
      if (d.moved) {
        const cur = containerLatLng(d.map, ev);
        const dLat = cur.lat - d.startLatLng.lat;
        const dLng = cur.lng - d.startLatLng.lng;
        cbRef.current.onDragEnd(shapeRef.current.id, moveGeometry(d.orig, dLat, dLng));
      }
      cbRef.current.onDragStart(null);
    };

    path.addEventListener("pointerdown", onPointerDown);
    return () => {
      path.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [interactive]);

  // Cursor + touch-action feedback based on selection.
  useEffect(() => {
    const path = pathEl(layerRef.current);
    if (!path) return;
    path.style.cursor = selected ? "move" : "pointer";
    try { path.style.touchAction = selected ? "none" : ""; } catch { /* noop */ }
  }, [selected, interactive]);

  const style = getShapeStyle(shape, selected);
  const label = shape.title && shape.title.trim() ? shape.title.trim() : "";

  const common = {
    ref: layerRef,
    pathOptions: style,
    interactive,
    eventHandlers: interactive ? { click: (e) => e.originalEvent?.stopPropagation?.() } : undefined,
  };

  if (shape.type === "circle") {
    return (
      <Circle center={shape.center} radius={shape.radius} {...common}>
        {label && <Tooltip permanent direction="center" className="yardit-area-label">{label}</Tooltip>}
      </Circle>
    );
  }
  if (shape.type === "rectangle") {
    return (
      <Rectangle bounds={shape.bounds} {...common}>
        {label && <Tooltip permanent direction="center" className="yardit-area-label">{label}</Tooltip>}
      </Rectangle>
    );
  }
  if (shape.type === "triangle") {
    return (
      <Polygon positions={shape.points} {...common}>
        {label && <Tooltip permanent direction="center" className="yardit-area-label">{label}</Tooltip>}
      </Polygon>
    );
  }
  return null;
}

export default function DraggableAreaShapes({
  shapes = [],
  selectedId = null,
  interactive = true,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  return (
    <>
      {shapes.map((s) => (
        <DraggableShape
          key={s.id}
          shape={s}
          selected={selectedId === s.id}
          interactive={interactive}
          onSelect={onSelect}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        />
      ))}
    </>
  );
}