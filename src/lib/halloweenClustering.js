export const HALLOWEEN_INDIVIDUAL_PIN_ZOOM = 18;

// Halloween uses its own zoom-based clustering rules, separate from normal Yardit listings.
// Far out, a whole town can collapse into one cluster. As the user zooms in, that cluster
// naturally breaks into neighborhood and then block-level clusters. Zoom 17 keeps the
// original ~450 ft neighborhood target; zoom 18 reveals individual homes.
const HALLOWEEN_CLUSTER_RADIUS_BY_ZOOM_METERS = {
  11: 3200,
  12: 2600,
  13: 1600,
  14: 900,
  15: 450,
  16: 250,
  17: 137.16,
};

export function shouldShowHalloweenHomes(zoom) {
  return Number(zoom) >= HALLOWEEN_INDIVIDUAL_PIN_ZOOM;
}

export function getHalloweenClusterRadiusMeters(zoom) {
  const z = Math.floor(Number(zoom));
  if (!Number.isFinite(z)) return HALLOWEEN_CLUSTER_RADIUS_BY_ZOOM_METERS[17];
  if (z <= 11) return HALLOWEEN_CLUSTER_RADIUS_BY_ZOOM_METERS[11];
  if (z >= 17) return HALLOWEEN_CLUSTER_RADIUS_BY_ZOOM_METERS[17];
  return HALLOWEEN_CLUSTER_RADIUS_BY_ZOOM_METERS[z];
}

function distanceMeters(a, b) {
  const latScale = 111320;
  const meanLat = ((a.lat + b.lat) / 2) * Math.PI / 180;
  const x = (a.lng - b.lng) * latScale * Math.cos(meanLat);
  const y = (a.lat - b.lat) * latScale;
  return Math.hypot(x, y);
}

// Build deterministic connected groups for the current zoom. If A is close to B and B is
// close to C, they belong to the same visible cluster at that zoom. This avoids the old
// order-dependent moving-center behavior.
export function getHalloweenNeighborhoodGroups(points, zoom) {
  const radiusMeters = getHalloweenClusterRadiusMeters(zoom);
  const count = points.length;
  const parent = Array.from({ length: count }, (_, index) => index);

  const find = (index) => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      if (distanceMeters(points[i], points[j]) <= radiusMeters) union(i, j);
    }
  }

  const grouped = new Map();
  points.forEach((point, index) => {
    const root = find(index);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(point);
  });

  return [...grouped.values()].map((members) => ({
    members,
    lat: members.reduce((sum, member) => sum + member.lat, 0) / members.length,
    lng: members.reduce((sum, member) => sum + member.lng, 0) / members.length,
    count: members.length,
  }));
}