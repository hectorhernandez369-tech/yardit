import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function HalloweenClusterGroup({ clusters, zoom }) {
  const map = useMap();
  const layerRef = useRef(L.layerGroup());

  useEffect(() => {
    layerRef.current.addTo(map);
    return () => layerRef.current.remove();
  }, [map]);

  useEffect(() => {
    layerRef.current.clearLayers();
    clusters.forEach((cluster) => {
      const size = zoom <= 14 ? 52 : zoom <= 16 ? 46 : 40;
      const half = size / 2;
      const icon = L.divIcon({
        className: "halloween-neighborhood-cluster",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#4b255f;border:3px solid #f28c28;display:flex;align-items:center;justify-content:center;color:#fff7e6;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 0 0 3px rgba(242,140,40,.25),0 3px 9px rgba(33,21,43,.45);">${cluster.count}</div>`,
        iconSize: [size, size],
        iconAnchor: [half, half],
      });
      const marker = L.marker([cluster.lat, cluster.lng], { icon, interactive: true });
      marker.on("click", () => map.flyTo([cluster.lat, cluster.lng], 18, { duration: 0.5 }));
      layerRef.current.addLayer(marker);
    });
  }, [clusters, map, zoom]);

  return null;
}