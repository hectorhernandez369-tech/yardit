import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { clusterHalloweenPoints } from "@/lib/halloweenPixelClustering";
import { isSpecialHalloweenIcon } from "@/lib/halloweenMapIcons";

const clusterIcon = (count) => L.divIcon({
  className: "halloween-neighborhood-cluster",
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#4b255f;border:3px solid #f28c28;display:flex;align-items:center;justify-content:center;color:#fff7e6;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 0 0 3px rgba(242,140,40,.25),0 3px 9px rgba(33,21,43,.45);">${count}</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

export default function HalloweenClusterGroup({ points, clusterRadius = 40, markerRefsMap }) {
  const map = useMap();
  const layerRef = useRef(L.layerGroup());
  const pointsRef = useRef(points);
  const radiusRef = useRef(clusterRadius);
  const updateRef = useRef(() => {});
  pointsRef.current = points;
  radiusRef.current = clusterRadius;

  useEffect(() => {
    let active = true;
    const layer = layerRef.current;
    const setMarkerVisibility = (hiddenIds) => {
      pointsRef.current.forEach(({ id }) => {
        const element = markerRefsMap?.current?.[id]?.getElement?.();
        if (element) element.style.display = hiddenIds.has(id) ? "none" : "";
      });
    };
    const update = () => {
      if (!active) return;
      layer.clearLayers();
      const clusterablePoints = pointsRef.current.filter(({ listing }) => !isSpecialHalloweenIcon(listing));
      const clusters = clusterHalloweenPoints(clusterablePoints, map, radiusRef.current);
      setMarkerVisibility(new Set(clusters.flatMap(({ members }) => members.map(({ id }) => id))));
      clusters.forEach((cluster) => {
        const marker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon(cluster.count), interactive: true });
        marker.on("click", () => map.flyTo([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, map.getMaxZoom()), { duration: 0.5 }));
        layer.addLayer(marker);
      });
    };

    updateRef.current = update;
    layer.addTo(map);
    update();
    map.on("zoomend", update);
    map.on("moveend", update);
    return () => {
      active = false;
      map.off("zoomend", update);
      map.off("moveend", update);
      setMarkerVisibility(new Set());
      layer.clearLayers();
      layer.remove();
    };
  }, [map, markerRefsMap]);

  useEffect(() => updateRef.current(), [points, clusterRadius]);
  return null;
}