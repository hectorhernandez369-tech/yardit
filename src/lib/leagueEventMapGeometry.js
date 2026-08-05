// Geometry helpers for the League Event venue map. Uses a local equirectangular
// approximation good enough for field-sized areas (< ~2 km).

const DEG = Math.PI / 180;
const M_PER_DEG_LAT = 111320;

const latLen = (lat) => M_PER_DEG_LAT;
const lngLen = (lat) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

// Offset a [lat,lng] by (mx, my) meters (east, north).
export const offsetLatLng = (center, mx, my) => {
  const [lat, lng] = center;
  return [lat + my / latLen(lat), lng + mx / lngLen(lat)];
};

// Inverse: pixel-ish meters from center to a point (east, north).
export const metersFromCenter = (center, point) => {
  const [lat, lng] = center;
  const [pLat, pLng] = point;
  return [(pLng - lng) * lngLen(lat), (pLat - lat) * latLen(lat)];
};

// Rotate a meter offset by deg around origin.
export const rotateMeters = (mx, my, deg) => {
  const t = deg * DEG;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [mx * c - my * s, mx * s + my * c];
};

// Rectangle corners (lat,lng) for a rotated rectangle geometry.
export const rectCorners = (geometry) => {
  const { center, widthM = 40, heightM = 60, rotationDeg = 0 } = geometry || {};
  const hw = widthM / 2;
  const hh = heightM / 2;
  const local = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  return local.map(([mx, my]) => {
    const [rx, ry] = rotateMeters(mx, my, rotationDeg);
    return offsetLatLng(center, rx, ry);
  });
};

export const rectCenterFromBounds = (bounds) => {
  const lats = bounds.map((b) => b[0]);
  const lngs = bounds.map((b) => b[1]);
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
};

// Width/height in meters from a corner set (axis-aligned estimate).
export const rectSizeFromCorners = (corners) => {
  const center = rectCenterFromBounds(corners);
  const east = offsetLatLng(center, 1, 0);
  const north = offsetLatLng(center, 0, 1);
  const dx = Math.abs(metersFromCenter(center, [corners[1][0], corners[1][1]])[0]) + Math.abs(metersFromCenter(center, [corners[3][0], corners[3][1]])[0]);
  const dy = Math.abs(metersFromCenter(center, [corners[3][0], corners[3][1]])[1]) + Math.abs(metersFromCenter(center, [corners[1][0], corners[1][1]])[1]);
  return { widthM: Math.max(10, dx), heightM: Math.max(10, dy) };
};

// Compute a bounding box (lat,lng SW & NE) from a list of points.
export const boundsFromPoints = (points) => {
  if (!points?.length) return null;
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
};

// All anchor points for a set of fields + venue objects (for fit-to-venue).
export const collectMapPoints = (fields = [], objects = []) => {
  const pts = [];
  fields.forEach((f) => {
    if (f.geometry?.type === "rectangle") pts.push(...rectCorners(f.geometry));
    else if (f.geometry?.type === "circle") pts.push(f.geometry.center);
    if (f.latitude && f.longitude) pts.push([f.latitude, f.longitude]);
  });
  objects.forEach((o) => {
    const g = o.geometry;
    if (!g) return;
    if (g.type === "rectangle") pts.push(...rectCorners(g));
    else if (g.type === "circle") pts.push(g.center);
    else if (g.type === "route" || g.type === "polygon") pts.push(...(g.points || []));
    else if (g.center) pts.push(g.center);
    else if (g.position) pts.push(g.position);
  });
  return pts.filter((p) => Array.isArray(p) && p.length === 2 && !Number.isNaN(p[0]) && !Number.isNaN(p[1]));
};

export const fitBoundsFromObjects = (fields, objects, fallbackCenter) => {
  const pts = collectMapPoints(fields, objects);
  if (pts.length < 2) return null;
  return boundsFromPoints(pts);
};

export const uid = () => `o_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const VENUE_OBJECT_TYPES = [
  { id: "field", label: "Field", icon: "Flag" },
  { id: "area", label: "Area", icon: "Square" },
  { id: "entrance", label: "Entrance", icon: "LogIn" },
  { id: "route", label: "Route", icon: "Route" },
  { id: "label", label: "Label", icon: "Type" },
  { id: "icon", label: "Icon", icon: "MapPin" },
];

export const AREA_SUBTYPES = ["Vendor Area", "Parking", "Warm-Up Area", "Team Check-In", "Admission Area", "Restricted Area"];
export const ENTRANCE_SUBTYPES = ["Spectator Entrance", "Player Entrance", "Coaches Entrance", "Vendor Entrance", "Emergency Entrance"];
export const SERVICE_ICONS = [
  { key: "restroom", label: "Restroom", glyph: "🚻" },
  { key: "concessions", label: "Concessions", glyph: "🍿" },
  { key: "first_aid", label: "First Aid", glyph: "✚" },
  { key: "parking", label: "Parking", glyph: "🅿" },
  { key: "information", label: "Information", glyph: "ℹ" },
  { key: "security", label: "Security", glyph: "🛡" },
  { key: "vendor", label: "Vendor", glyph: "🏪" },
  { key: "ticket", label: "Ticket Booth", glyph: "🎟" },
  { key: "water", label: "Water", glyph: "💧" },
  { key: "trash", label: "Trash", glyph: "🗑" },
  { key: "accessible", label: "Accessible Entrance", glyph: "♿" },
];

export const serviceIconGlyph = (key) => SERVICE_ICONS.find((i) => i.key === key)?.glyph || "📍";

export const defaultFieldGeometry = (center) => ({ type: "rectangle", center: [...center], widthM: 50, heightM: 100, rotationDeg: 0 });
export const defaultAreaGeometry = (center) => ({ type: "rectangle", center: [...center], widthM: 80, heightM: 80, rotationDeg: 0 });