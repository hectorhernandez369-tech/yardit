// Smaller on-screen grouping distance as users zoom into neighborhoods.
export function getHalloweenClusterRadius(zoom, baseRadius = 40) {
  return baseRadius * Math.max(0.45, Math.min(0.85, 1 - (zoom - 10) * 0.1));
}

export function clusterHalloweenPoints(points, map, baseRadius = 40) {
  const radius = getHalloweenClusterRadius(map.getZoom(), baseRadius);
  const groups = [];
  const projected = points
    .map((point) => ({ point, pixel: map.project([point.lat, point.lng], map.getZoom()) }))
    .sort((a, b) => a.pixel.x - b.pixel.x || a.pixel.y - b.pixel.y || String(a.point.id).localeCompare(String(b.point.id)));

  for (const candidate of projected) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const group of groups) {
      const distance = Math.hypot(candidate.pixel.x - group.x, candidate.pixel.y - group.y);
      // Every pair must fit the radius, preventing neighborhood-spanning chains.
      if (distance <= radius && distance < nearestDistance &&
          group.entries.every(({ pixel }) => pixel.distanceTo(candidate.pixel) <= radius)) {
        nearest = group;
        nearestDistance = distance;
      }
    }
    if (!nearest) {
      groups.push({ entries: [candidate], x: candidate.pixel.x, y: candidate.pixel.y });
      continue;
    }
    const count = nearest.entries.length;
    nearest.x = (nearest.x * count + candidate.pixel.x) / (count + 1);
    nearest.y = (nearest.y * count + candidate.pixel.y) / (count + 1);
    nearest.entries.push(candidate);
  }

  return groups.filter(({ entries }) => entries.length >= 2).map(({ entries }) => {
    const members = entries.map(({ point }) => point);
    return {
      members,
      count: members.length,
      lat: members.reduce((sum, member) => sum + member.lat, 0) / members.length,
      lng: members.reduce((sum, member) => sum + member.lng, 0) / members.length,
    };
  });
}