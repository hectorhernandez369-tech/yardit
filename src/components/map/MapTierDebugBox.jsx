import React, { useMemo } from "react";
import { shouldShowAsPin } from "./ClusterGroup";

export default function MapTierDebugBox({ zoom, showListingsActive }) {
  const visibleTier = useMemo(() => {
    if (shouldShowAsPin(zoom, "free")) return "Free";
    if (shouldShowAsPin(zoom, "featured")) return "Featured";
    if (shouldShowAsPin(zoom, "premium")) return "Premium";
    return "None";
  }, [zoom]);

  return (
    <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none rounded-lg bg-black/65 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm">
      <div>Zoom: {zoom}</div>
      <div>Tier Visible: {visibleTier}</div>
      <div>Show Listings: {showListingsActive ? "ON" : "OFF"}</div>
    </div>
  );
}