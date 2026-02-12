import React from "react";

export default function MapDebugOverlay({ zoom, dbCount, eligibleCount, pinCount, clusterCount, fallback }) {
  return (
    <div 
      className="absolute bottom-4 left-4 z-[1001] bg-black/70 text-green-400 text-xs font-mono px-3 py-2 rounded-lg pointer-events-none"
      style={{ lineHeight: "1.6" }}
    >
      <div>zoom: {zoom}</div>
      <div>dbCount: {dbCount}</div>
      <div>eligible: {eligibleCount}</div>
      <div>pins: {pinCount}</div>
      <div>clusters: {clusterCount}</div>
      {fallback && <div className="text-yellow-400">⚠ fallback active</div>}
    </div>
  );
}