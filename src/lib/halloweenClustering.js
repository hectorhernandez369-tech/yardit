const HALLOWEEN_CLUSTER_RADIUS_METERS = 137.16;
export const HALLOWEEN_INDIVIDUAL_PIN_ZOOM = 18;

export function shouldShowHalloweenHomes(zoom) {
  return Number(zoom) >= HALLOWEEN_INDIVIDUAL_PIN_ZOOM;
}

function distanceMeters(a, b) {
  const latScale = 111320;
  const meanLat = ((a.lat + b.lat) / 2) * Math.PI / 180;
  const x = (a.lng - b.lng) * latScale * Math.cos(meanLat);
  const y = (a.lat - b.lat) * latScale;
  return Math.hypot(x, y);
}

export function getHalloweenNeighborhoodGroups(points) {
  const groups = [];

  points.forEach((point) => {
    const group = groups.find((candidate) =>
      distanceMeters(point, candidate) <= HALLOWEEN_CLUSTER_RADIUS_METERS
    );
    if (group) {
      group.members.push(point);
      group.lat = group.members.reduce((sum, member) => sum + member.lat, 0) / group.members.length;
      group.lng = group.members.reduce((sum, member) => sum + member.lng, 0) / group.members.length;
      group.count = group.members.length;
    } else {
      groups.push({ members: [point], lat: point.lat, lng: point.lng, count: 1 });
    }
  });

  return groups;
}