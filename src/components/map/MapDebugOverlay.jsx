import React from "react";

export default function MapDebugOverlay({ zoom, dbCount, eligibleCount, pinCount, clusterCount, fallback, firstRow }) {
  return (
    <div 
      className="absolute bottom-4 left-4 z-[1001] bg-black/70 text-green-400 text-xs font-mono px-3 py-2 rounded-lg pointer-events-none"
      style={{ lineHeight: "1.6", maxWidth: "360px" }}
    >
      <div>source: listings</div>
      <div>zoom: {zoom}</div>
      <div>dbCount: {dbCount}</div>
      <div>eligible: {eligibleCount}</div>
      <div>pins: {pinCount}</div>
      <div>clusters: {clusterCount}</div>
      {fallback && <div className="text-yellow-400">⚠ fallback active</div>}
      {firstRow && (
        <div className="mt-1 pt-1 border-t border-green-800 text-green-300">
          <div>now: {firstRow.nowISO}</div>
          <div className="truncate">1st id: {firstRow.id}</div>
          <div className="truncate">1st status: {firstRow.status}</div>
          <div className="truncate">1st start: {firstRow.startAt}</div>
          <div className="truncate">1st end: {firstRow.endAt}</div>
          <div>1st tier: {firstRow.tier}</div>
          <div>1st timeOk: {String(firstRow.timeOk)}</div>
        </div>
      )}
    </div>
  );
}