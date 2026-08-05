import { useEffect, useState } from "react";
import { Circle, Polygon, Rectangle, useMap, useMapEvents } from "react-leaflet";
import AreaShapeViews from "./AreaShapeViews";

const DRAFT_STYLE = { color: "#F4A849", fillColor: "#F4A849", fillOpacity: 0.12, weight: 2, dashArray: "6 5" };

export default function AreaDrawingLayer({ drawingMode, shapes, onAddShape, onFinishDrawing }) {
  const map = useMap();
  const [draft, setDraft] = useState(null);
  const [vertices, setVertices] = useState([]);

  useEffect(() => {
    if (drawingMode !== "none") {
      map.dragging.disable();
    } else {
      map.dragging.enable();
      setDraft(null);
      setVertices([]);
    }
  }, [drawingMode, map]);

  useMapEvents({
    mousedown(e) {
      if (drawingMode === "circle") setDraft({ type: "circle", center: [e.latlng.lat, e.latlng.lng], radius: 15 });
      else if (drawingMode === "rectangle") setDraft({ type: "rectangle", corner1: [e.latlng.lat, e.latlng.lng], corner2: [e.latlng.lat, e.latlng.lng] });
    },
    mousemove(e) {
      if (!draft) return;
      if (draft.type === "circle") setDraft({ ...draft, radius: map.distance(draft.center, [e.latlng.lat, e.latlng.lng]) });
      else if (draft.type === "rectangle") setDraft({ ...draft, corner2: [e.latlng.lat, e.latlng.lng] });
    },
    mouseup() {
      if (!draft) return;
      if (draft.type === "circle" && draft.radius > 8) { onAddShape({ type: "circle", center: draft.center, radius: draft.radius }); onFinishDrawing(); }
      else if (draft.type === "rectangle") { onAddShape({ type: "rectangle", bounds: [draft.corner1, draft.corner2] }); onFinishDrawing(); }
      setDraft(null);
    },
    click(e) {
      if (drawingMode !== "triangle") return;
      const pts = [...vertices, [e.latlng.lat, e.latlng.lng]];
      if (pts.length === 3) { onAddShape({ type: "triangle", points: pts }); setVertices([]); onFinishDrawing(); }
      else setVertices(pts);
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