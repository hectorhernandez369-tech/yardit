import React from "react";
import { useMap } from "react-leaflet";
import { Crosshair, Loader2 } from "lucide-react";

export default function MapZoomControl({ onMyLocation, isLocating, locationError }) {
  const map = useMap();

  const btnBase =
    "w-9 h-9 bg-white hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors disabled:opacity-50";

  return (
    <div
      className="absolute top-3 left-3 z-[1000] flex flex-col shadow-md rounded-lg overflow-hidden border border-gray-300"
      style={{ pointerEvents: "auto" }}
    >
      <button
        onClick={() => map.zoomIn()}
        className={`${btnBase} text-lg font-bold border-b border-gray-200`}
        title="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        className={`${btnBase} text-lg font-bold border-b border-gray-200`}
        title="Zoom out"
      >
        −
      </button>
      <button
        onClick={onMyLocation}
        disabled={isLocating || !!locationError}
        className={btnBase}
        title={locationError ? "Location unavailable" : "My Location"}
      >
        {isLocating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Crosshair className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}