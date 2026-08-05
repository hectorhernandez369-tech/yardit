import { Circle, Polygon, Rectangle, Tooltip } from "react-leaflet";

const SHAPE_STYLE = { color: "#F4A849", fillColor: "#F4A849", fillOpacity: 0.18, weight: 2 };

export function AreaShapeView({ shape }) {
  if (shape.type === "circle") {
    return (
      <Circle center={shape.center} radius={shape.radius} pathOptions={SHAPE_STYLE}>
        <Tooltip permanent direction="center" className="yardit-area-label">{shape.title}</Tooltip>
      </Circle>
    );
  }
  if (shape.type === "rectangle") {
    return (
      <Rectangle bounds={shape.bounds} pathOptions={SHAPE_STYLE}>
        <Tooltip permanent direction="center" className="yardit-area-label">{shape.title}</Tooltip>
      </Rectangle>
    );
  }
  if (shape.type === "triangle") {
    return (
      <Polygon positions={shape.points} pathOptions={SHAPE_STYLE}>
        <Tooltip permanent direction="center" className="yardit-area-label">{shape.title}</Tooltip>
      </Polygon>
    );
  }
  return null;
}

export default function AreaShapeViews({ shapes = [] }) {
  return (
    <>
      {shapes.map((s) => <AreaShapeView key={s.id} shape={s} />)}
    </>
  );
}