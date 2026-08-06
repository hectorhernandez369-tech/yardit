import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { useMapRepaint } from "./useMapRepaint";

const HANDLE_HIT = 32;
const HANDLE_DOT = 14;
const MIN_RADIUS = 5;

const MAP_HANDLERS = [
  "dragging",
  "touchZoom",
  "doubleClickZoom",
  "scrollWheelZoom",
  "boxZoom",
  "keyboard",
];

function handlesFor(shape) {
  if (!shape) return [];
  if (shape.type === "circle") return ["r"];
  if (shape.type === "rectangle") return ["nw", "ne", "sw", "se"];
  if (shape.type === "triangle") return ["0", "1", "2"];
  return [];
}

function handlePointFromShape(map, shape, handleId) {
  if (shape.type === "circle") {
    const center = map.latLngToContainerPoint(shape.center);
    const dLng =
      (shape.radius || 0) /
      (111320 * Math.cos((shape.center[0] * Math.PI) / 180));
    const east = map.latLngToContainerPoint([
      shape.center[0],
      shape.center[1] + dLng,
    ]);
    return { x: east.x, y: center.y };
  }

  if (shape.type === "rectangle") {
    const bounds = shape.bounds;
    const corners = {
      nw: [bounds[1][0], bounds[0][1]],
      ne: [bounds[1][0], bounds[1][1]],
      sw: [bounds[0][0], bounds[0][1]],
      se: [bounds[0][0], bounds[1][1]],
    };
    const point = map.latLngToContainerPoint(corners[handleId]);
    return { x: point.x, y: point.y };
  }

  if (shape.type === "triangle") {
    const point = map.latLngToContainerPoint(
      shape.points[Number.parseInt(handleId, 10)]
    );
    return { x: point.x, y: point.y };
  }

  return null;
}

function oppositeCorner(bounds, handleId) {
  const [southWest, northEast] = bounds;

  return {
    nw: [southWest[0], northEast[1]],
    ne: [southWest[0], southWest[1]],
    sw: [northEast[0], northEast[1]],
    se: [northEast[0], southWest[1]],
  }[handleId];
}

function computePatch(map, shape, handleId, latLng) {
  if (shape.type === "circle") {
    return {
      radius: Math.max(
        MIN_RADIUS,
        map.distance(shape.center, [latLng.lat, latLng.lng])
      ),
    };
  }

  if (shape.type === "rectangle") {
    const opposite = oppositeCorner(shape.bounds, handleId);

    return {
      bounds: [
        [
          Math.min(opposite[0], latLng.lat),
          Math.min(opposite[1], latLng.lng),
        ],
        [
          Math.max(opposite[0], latLng.lat),
          Math.max(opposite[1], latLng.lng),
        ],
      ],
    };
  }

  if (shape.type === "triangle") {
    const index = Number.parseInt(handleId, 10);

    return {
      points: shape.points.map((point, pointIndex) =>
        pointIndex === index ? [latLng.lat, latLng.lng] : point
      ),
    };
  }

  return null;
}

export default function AreaResizeLayer({ shape, onResize }) {
  const map = useMap();
  const container = map.getContainer();
  useMapRepaint();

  const [dragId, setDragId] = useState(null);
  const [dragPoint, setDragPoint] = useState(null);

  const shapeRef = useRef(shape);
  shapeRef.current = shape;

  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const enabledHandlersRef = useRef({});

  const lockMap = () => {
    const enabledHandlers = {};

    MAP_HANDLERS.forEach((handlerName) => {
      const handler = map[handlerName];
      if (!handler || typeof handler.enabled !== "function") return;

      enabledHandlers[handlerName] = handler.enabled();
      handler.disable();
    });

    enabledHandlersRef.current = enabledHandlers;
    container.style.touchAction = "none";
  };

  const unlockMap = () => {
    MAP_HANDLERS.forEach((handlerName) => {
      const handler = map[handlerName];
      if (
        handler &&
        typeof handler.enable === "function" &&
        enabledHandlersRef.current[handlerName]
      ) {
        handler.enable();
      }
    });

    enabledHandlersRef.current = {};
    container.style.touchAction = "";
  };

  useEffect(() => {
    if (!dragId) return undefined;

    const onMove = (event) => {
      event.preventDefault();

      const rect = container.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      setDragPoint(point);

      const latLng = map.containerPointToLatLng([point.x, point.y]);
      const patch = computePatch(
        map,
        shapeRef.current,
        dragId,
        latLng
      );

      if (patch) onResizeRef.current(patch);
    };

    const onUp = () => {
      setDragId(null);
      setDragPoint(null);
      unlockMap();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      unlockMap();
    };
  }, [dragId, map, container]);

  const startResize = (handleId, event) => {
    event.stopPropagation();
    event.preventDefault();

    const rect = container.getBoundingClientRect();

    lockMap();
    setDragPoint({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setDragId(handleId);
  };

  const handleIds = handlesFor(shape);
  if (!handleIds.length) return null;

  return createPortal(
    <div
      data-no-map-click
      className="pointer-events-none absolute inset-0 z-[750]"
    >
      {handleIds.map((handleId) => {
        const point =
          dragId === handleId && dragPoint
            ? dragPoint
            : handlePointFromShape(map, shape, handleId);

        if (!point) return null;

        return (
          <div
            key={handleId}
            onPointerDown={(event) => startResize(handleId, event)}
            className="pointer-events-auto absolute flex items-center justify-center"
            style={{
              left: point.x,
              top: point.y,
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
                boxShadow: "0 2px 7px rgba(0,0,0,0.38)",
              }}
            />
          </div>
        );
      })}
    </div>,
    container
  );
}