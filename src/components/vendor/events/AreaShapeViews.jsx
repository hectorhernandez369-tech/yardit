import { Circle, Polygon, Rectangle, Tooltip } from "react-leaflet";

export function getShapeStyle(shape, selected = false) {
  const baseOpacity = Number(shape.lineOpacity ?? 0.9);
  return {
    color: shape.lineColor || shape.fillColor || "#F4A849",
    opacity: Math.min(1, baseOpacity + (selected ? 0.1 : 0)),
    fillColor: shape.fillColor || "#F4A849",
    fillOpacity: Number(shape.fillOpacity ?? 0.2),
    weight: selected ? 4 : 2,
  };
}

export function AreaShapeView({ shape, selectedId }) {
  const selected = selectedId === shape.id;
  const style = getShapeStyle(shape, selected);
  const label = shape.title && shape.title.trim() ? shape.title.trim() : "";
  if (shape.type === "circle") {
    return (
      <Circle center={shape.center} radius={shape.radius} pathOptions={style}>
        {label && <Tooltip permanent direction="center" className="yardit-area-label">{label}</Tooltip>}
      </Circle>
    );
  }
  if (shape.type === "rectangle") {
    return (
      <Rectangle bounds={shape.bounds} pathOptions={style}>
        {label && <Tooltip permanent direction="center" className="yardit-area-label">{label}</Tooltip>}
      </Rectangle>
    );
  }
  if (shape.type === "triangle") {
    return (
      <Polygon positions={shape.points} pathOptions={style}>
        {label && <Tooltip permanent direction="center" className="yardit-area-label">{label}</Tooltip>}
      </Polygon>
    );
  }
  return null;
}

export default function AreaShapeViews({ shapes = [], selectedId = null }) {
  return (
    <>
      {shapes.map((s) => <AreaShapeView key={s.id} shape={s} selectedId={selectedId} />)}
    </>
  );
}