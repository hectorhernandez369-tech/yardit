export function clusterHalloweenPoints(points, map, radius) {
  const parent = points.map((_, index) => index);
  const pixels = points.map((point) => map.latLngToContainerPoint([point.lat, point.lng]));

  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };

  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < pixels.length; i += 1) {
    for (let j = i + 1; j < pixels.length; j += 1) {
      if (pixels[i].distanceTo(pixels[j]) <= radius) union(i, j);
    }
  }

  const groups = new Map();
  points.forEach((point, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(point);
  });

  return [...groups.values()].filter((members) => members.length >= 2).map((members) => ({
    members,
    count: members.length,
    lat: members.reduce((sum, member) => sum + member.lat, 0) / members.length,
    lng: members.reduce((sum, member) => sum + member.lng, 0) / members.length,
  }));
}