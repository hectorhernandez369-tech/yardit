import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { shapeBBoxPixels } from "@/lib/areaGeometry";
import { fitLabel } from "@/lib/areaLabelFit";
import { useMapRepaint } from "./useMapRepaint";

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
      return { id: s.id, bbox, fit };
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