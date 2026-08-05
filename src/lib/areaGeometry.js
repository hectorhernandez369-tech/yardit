// Geometry helpers for area highlight shapes on a Leaflet map.

export function shapeLatLngBounds(shape) {
  if (!shape) return null;
  if (shape.type === "circle") {
    const r = shape.radius || 0;
    const dLat = r / 111320;
    const dLng = r / (111320 * Math.cos((shape.center[0] * Math.PI) / 180));
    return [
      shape.center[0] - dLat,
      shape.center[1] - dLng,
      shape.center[0] + dLat,
      shape.center[1] + dLng,
    ];
  }
  if (shape.type === "rectangle") {
    const b = shape.bounds || [];
    if (!b[0] || !b[1]) return null;
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

export function shapeBBoxPixels(map, shape) {
  const b = shapeLatLngBounds(shape);
  if (!b) return null;
  const sw = map.latLngToContainerPoint([b[0], b[1]]);
  const ne = map.latLngToContainerPoint([b[2], b[3]]);
  const left = Math.min(sw.x, ne.x);
  const right = Math.max(sw.x, ne.x);
  const top = Math.min(sw.y, ne.y);
  const bottom = Math.max(sw.y, ne.y);
  return {
    left,
    top,
    right,
    bottom,
    w: Math.max(0, right - left),
    h: Math.max(0, bottom - top),
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
  };
}

export function areaCenter(shape) {
  if (!shape) return null;
  if (shape.type === "circle") return shape.center;
  if (shape.type === "rectangle") {
    return [
      (shape.bounds[0][0] + shape.bounds[1][0]) / 2,
      (shape.bounds[0][1] + shape.bounds[1][1]) / 2,
    ];
  }
  if (shape.type === "triangle") {
    const pts = shape.points;
    return [
      pts.reduce((s, p) => s + p[0], 0) / pts.length,
      pts.reduce((s, p) => s + p[1], 0) / pts.length,
    ];
  }
  return null;
}