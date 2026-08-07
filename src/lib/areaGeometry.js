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

export function isPointInShape(shape, lat, lng) {
  if (!shape) return false;
  if (shape.type === "circle") {
    const c = shape.center;
    const r = shape.radius || 0;
    const dLat = (lat - c[0]) * 111320;
    const dLng = (lng - c[1]) * 111320 * Math.cos((c[0] * Math.PI) / 180);
    return Math.hypot(dLat, dLng) <= r;
  }
  if (shape.type === "rectangle") {
    const b = shape.bounds || [];
    if (!b[0] || !b[1]) return false;
    const minLat = Math.min(b[0][0], b[1][0]);
    const maxLat = Math.max(b[0][0], b[1][0]);
    const minLng = Math.min(b[0][1], b[1][1]);
    const maxLng = Math.max(b[0][1], b[1][1]);
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }
  if (shape.type === "triangle") {
    const pts = shape.points || [];
    if (pts.length < 3) return false;
    const x = lat;
    const y = lng;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0];
      const yi = pts[i][1];
      const xj = pts[j][0];
      const yj = pts[j][1];
      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  return false;
}

export function offsetShapeGeometry(shape, dLat, dLng) {
  if (shape.type === "circle") {
    return { center: [shape.center[0] + dLat, shape.center[1] + dLng] };
  }
  if (shape.type === "rectangle") {
    return {
      bounds: [
        [shape.bounds[0][0] + dLat, shape.bounds[0][1] + dLng],
        [shape.bounds[1][0] + dLat, shape.bounds[1][1] + dLng],
      ],
    };
  }
  if (shape.type === "triangle") {
    return { points: shape.points.map((p) => [p[0] + dLat, p[1] + dLng]) };
  }
  return {};
}