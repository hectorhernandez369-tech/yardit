import React, { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Simple spatial clustering: groups points within a pixel radius at a given zoom
export function clusterPoints(points, map, radius) {
  const clusters = [];
  const used = new Set();

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;
    const pxA = map.latLngToContainerPoint([points[i].lat, points[i].lng]);
    const group = [points[i]];
    used.add(i);

    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue;
      const pxB = map.latLngToContainerPoint([points[j].lat, points[j].lng]);
      const dist = Math.sqrt(Math.pow(pxA.x - pxB.x, 2) + Math.pow(pxA.y - pxB.y, 2));
      if (dist <= radius) {
        group.push(points[j]);
        used.add(j);
      }
    }

    if (group.length >= 2) {
      const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
      const avgLng = group.reduce((s, p) => s + p.lng, 0) / group.length;
      clusters.push({ lat: avgLat, lng: avgLng, count: group.length, ids: group.map(p => p.id) });
    }
  }

  return clusters;
}

export function getClusterStyle(count) {
  if (count >= 25) return { color: "#F4A849", radius: 20 };
  if (count >= 10) return { color: "#5DADA5", radius: 16 };
  return { color: "#5DADA5", radius: 14 };
}

function formatCount(n) {
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return String(n);
}

export default function ClusterGroup({ points, clusterRadius = 50, minPoints = 2 }) {
  const map = useMap();
  const layerRef = useRef(L.layerGroup());

  // Attach layer group once
  useEffect(() => {
    layerRef.current.addTo(map);
    return () => {
      layerRef.current.remove();
    };
  }, [map]);

  // Recompute clusters whenever zoom/points change
  useEffect(() => {
    const update = () => {
      layerRef.current.clearLayers();

      if (points.length === 0) return;

      const clusters = clusterPoints(points, map, clusterRadius);
      const clusteredIds = new Set();
      clusters.forEach(c => c.ids.forEach(id => clusteredIds.add(id)));

      // Only render cluster circles (individual pins are handled by the parent)
      clusters.forEach(cluster => {
        if (cluster.count < minPoints) return;
        const style = getClusterStyle(cluster.count);
        
        const icon = L.divIcon({
          className: "cluster-marker",
          html: `<div style="
            width:${style.radius * 2}px;
            height:${style.radius * 2}px;
            border-radius:50%;
            background:${style.color};
            border:2px solid #2C4F4E;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-size:14px;
            font-weight:bold;
            cursor:pointer;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ">${formatCount(cluster.count)}</div>`,
          iconSize: [style.radius * 2, style.radius * 2],
          iconAnchor: [style.radius, style.radius],
        });

        const marker = L.marker([cluster.lat, cluster.lng], { icon, interactive: true });
        marker.on("click", () => {
          const currentZoom = map.getZoom();
          map.flyTo([cluster.lat, cluster.lng], Math.min(currentZoom + 2, 18), { duration: 0.5 });
        });
        layerRef.current.addLayer(marker);
      });
    };

    update();
    map.on("zoomend", update);
    map.on("moveend", update);
    return () => {
      map.off("zoomend", update);
      map.off("moveend", update);
    };
  }, [map, points, clusterRadius, minPoints]);

  // Expose clustered IDs via a callback would be complex; instead we return null
  // The parent checks visibility via the exported helper
  return null;
}

// Helper: given current zoom and a tier, should this location show as individual pin?
export function shouldShowAsPin(zoom, listing) {
  if (String(listing?.listingNumber || "").startsWith("YARD-SCREENSHOT-")) return true;

  if (listing?.listingType === "event") {
    const tier = listing?.event_tier || listing?.tier;
    if (tier === "marquee") return zoom >= 11;
    if (tier === "premium") return zoom >= 12;
    if (tier === "featured") return zoom >= 13;
    return zoom >= 14;
  }

  const tier = listing?.tier;
  if (tier === "neighborhood_tier" || tier === "neighborhood_event") return zoom >= 12;
  if (tier === "premium") return zoom >= 11;
  if (tier === "featured" || tier === "map_pin") return zoom >= 13;
  return zoom >= 15;
}

// Helper: given points that should NOT be individual pins, compute which are clustered
export function getClusteredIds(points, map, radius = 50) {
  if (!map || points.length === 0) return new Set();
  const clusters = clusterPoints(points, map, radius);
  const ids = new Set();
  clusters.forEach(c => c.ids.forEach(id => ids.add(id)));
  return ids;
}