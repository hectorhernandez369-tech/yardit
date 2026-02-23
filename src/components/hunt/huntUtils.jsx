export function calculateTotalDistance(stops) {
  if (!stops || stops.length < 2) return 0;
  let totalDist = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const lat1 = stops[i].lat;
    const lon1 = stops[i].lng;
    const lat2 = stops[i+1].lat;
    const lon2 = stops[i+1].lng;
    
    const R = 3959; // miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalDist += R * c;
  }
  return totalDist;
}

export function openExternalMaps(stops) {
  if (!stops || stops.length === 0) return;
  
  // Google Maps Universal URL
  // https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...
  
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  
  let waypoints = "";
  if (stops.length > 2) {
    waypoints = stops.slice(1, stops.length - 1)
      .map(s => `${s.lat},${s.lng}`)
      .join('|');
  }
  
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }
  
  window.open(url, '_blank');
}