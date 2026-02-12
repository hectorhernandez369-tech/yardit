import React from "react";

export default function MapDebugOverlay({ zoom, totalListings, pinsRendered, clusterEnabled }) {
  return (
    <div 
      className="absolute bottom-4 left-4 z-[1001] bg-black/70 text-green-400 text-xs font-mono px-3 py-2 rounded-lg pointer-events-none"
      style={{ lineHeight: "1.6" }}
    >
      <div>zoom: {zoom}</div>
      <div>listings: {totalListings}</div>
      <div>pins: {pinsRendered}</div>
      <div>cluster: {clusterEnabled ? "true" : "false"}</div>
    </div>
  );
}