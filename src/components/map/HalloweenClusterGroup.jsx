import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { clusterHalloweenPoints } from "@/lib/halloweenPixelClustering";

const clusterIcon = (count) => L.divIcon({
  className: "halloween-neighborhood-cluster",
  html: `<div style="width:42px;height:42px;border-radius:50%;background:#4b255f;border:3px solid #f28c28;display:flex;align-items:center;justify-content:center;color:#fff7e6;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 0 0 3px rgba(242,140,40,.25),0 3px 9px rgba(33,21,43,.45);">${count}</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

export default function HalloweenClusterGroup({ points, clusterRadius = 55, onClusteredIdsChange }) {
  const map = useMap();
  const layerRef = useRef(L.layerGroup());

  useEffect(() => {
    layerRef.current.addTo(map);
    return () => layerRef.current.remove();
  }, [map]);

  useEffect(() => {
    const update = () => {
      layerRef.current.clearLayers();
      const clusters = clusterHalloweenPoints(points, map, clusterRadius);
      onClusteredIdsChange(new Set(clusters.flatMap(({ members }) => members.map(({ id }) => id))));
      clusters.forEach((cluster) => {
        const marker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon(cluster.count), interactive: true });
        marker.on("click", () => map.flyTo(
          [cluster.lat, cluster.lng],
          Math.min(map.getZoom() + 2, map.getMaxZoom()),
          { duration: 0.5 }
        ));
        layerRef.current.addLayer(marker);
      });
    };

    update();
    map.on("zoomend", update);
    map.on("moveend", update);
    return () => {
      map.off("zoomend", update);
      map.off("moveend", update);
      onClusteredIdsChange(new Set());
    };
  }, [clusterRadius, map, onClusteredIdsChange, points]);

  return null;
}