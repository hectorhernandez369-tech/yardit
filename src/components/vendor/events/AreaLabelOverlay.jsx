import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { shapeBBoxPixels } from "@/lib/areaGeometry";
import { fitLabel } from "@/lib/areaLabelFit";
import { useMapRepaint } from "./useMapRepaint";

const METERS_TO_FEET = 3.28084;

function feet(valueMeters) {
  const n = Number(valueMeters);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * METERS_TO_FEET);
}

function shapeMeasurement(map, shape) {
  if (!map || !shape) return "";

  try {
    if (shape.type === "circle") {
      const radiusFt = feet(shape.radius);
      if (radiusFt === null) return "";
      return `R ${radiusFt} ft · D ${radiusFt * 2} ft`;
    }

    if (shape.type === "rectangle") {
      if (!Array.isArray(shape.bounds) || shape.bounds.length < 2) return "";

      const a = shape.bounds[0];
      const b = shape.bounds[1];

      const widthMeters = map.distance(
        [a[0], a[1]],
        [a[0], b[1]]
      );

      const heightMeters = map.distance(
        [a[0], a[1]],
        [b[0], a[1]]
      );

      const widthFt = feet(widthMeters);
      const heightFt = feet(heightMeters);

      if (widthFt === null || heightFt === null) return "";
      return `${widthFt} ft × ${heightFt} ft`;
    }

    if (shape.type === "triangle") {
      if (!Array.isArray(shape.points) || shape.points.length < 3) return "";

      const [a, b, c] = shape.points;
      const ab = feet(map.distance(a, b));
      const bc = feet(map.distance(b, c));
      const ca = feet(map.distance(c, a));

      if ([ab, bc, ca].some((n) => n === null)) return "";
      return `${ab} ft · ${bc} ft · ${ca} ft`;
    }
  } catch {
    return "";
  }

  return "";
}

export function canRenderAreaTitle(map, shape) {
  if (!map || !shape) return false;

  try {
    const container = map.getContainer?.();
    if (!container || !container.isConnected) return false;

    const bbox = shapeBBoxPixels(map, shape);
    if (!bbox || bbox.w < 6 || bbox.h < 6) return false;

    return Boolean(fitLabel(shape.title || "", bbox.w, bbox.h));
  } catch {
    return false;
  }
}

// Renders smart, auto-fitting titles inside each highlighted area, plus a
// temporary floating callout for the selected shape. Display-only: does not
// capture pointer events so map interaction stays intact.
export default function AreaLabelOverlay({ shapes = [], calloutShape = null, calloutShown = false }) {
  const map = useMap();
  const container = map.getContainer();
  useMapRepaint();

  const labels = shapes
    .map((s) => {
      const bbox = shapeBBoxPixels(map, s);
      if (!bbox || bbox.w < 6 || bbox.h < 6) return null;
      const fit = fitLabel(s.title || "", bbox.w, bbox.h);
      if (!fit) return null;
      return { id: s.id, bbox, fit, measurement: shapeMeasurement(map, s) };
    })
    .filter(Boolean);

  const callout = (() => {
    if (!calloutShape || !calloutShown) return null;
    const bbox = shapeBBoxPixels(map, calloutShape);
    if (!bbox) return null;
    const aboveTop = bbox.top - 58;
    const placeBelow = aboveTop < 4;
    return {
      bbox,
      title: (calloutShape.title || "").trim() || "Untitled Area",
      top: placeBelow ? bbox.bottom + 8 : aboveTop,
      transform: placeBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
    };
  })();

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-[650] overflow-hidden">
      {labels.map((l) => (
        <div
          key={l.id}
          className="absolute flex items-center justify-center text-center"
          style={{ left: l.bbox.left, top: l.bbox.top, width: l.bbox.w, height: l.bbox.h, padding: 4 }}
        >
          <div
            style={{
              fontSize: l.fit.fontSize,
              lineHeight: `${l.fit.lineHeight}px`,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              textShadow:
                "0 1px 2px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.85), 0 0 7px rgba(0,0,0,0.7)",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {l.fit.lines.map((line, i) => (
              <div
                key={i}
                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {line}
              </div>
            ))}
            {l.measurement && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: Math.max(9, Math.min(12, l.fit.fontSize - 2)),
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: "#ffffff",
                  textShadow:
                    "0 1px 2px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.85)",
                  whiteSpace: "nowrap",
                }}
              >
                {l.measurement}
              </div>
            )}
          </div>
        </div>
      ))}

      {callout && (
        <div className="absolute" style={{ left: callout.bbox.cx, top: callout.top, transform: callout.transform }}>
          <div
            style={{
              background: "rgba(255,255,255,0.97)",
              border: "2px solid #2C4F4E",
              borderRadius: 9999,
              padding: "5px 14px",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#2C4F4E",
              whiteSpace: "nowrap",
              boxShadow: "0 6px 16px rgba(0,0,0,0.28)",
            }}
          >
            {callout.title}
          </div>
        </div>
      )}
    </div>,
    container
  );
}