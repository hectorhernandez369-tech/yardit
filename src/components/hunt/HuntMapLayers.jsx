import React from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useHunt, HUNT_ENABLED, MAPBOX_ROUTE_ENABLED } from "@/components/hunt/HuntContext";

export default function HuntMapLayers() {
  const { huntStops, yardsailActive, routeCoords } = useHunt() || {};

  if (!HUNT_ENABLED || !yardsailActive || !huntStops || huntStops.length === 0) {
    return null;
  }

  // Create numbered icons
  const createNumberedIcon = (number, status) => {
    // Status colors
    let bgClass = "bg-amber-500";
    let borderClass = "border-white";
    if (status === "arrived") {
      bgClass = "bg-blue-600";
    } else if (status === "completed") {
      bgClass = "bg-gray-500";
    }

    const html = `
      <div class="flex items-center justify-center w-8 h-8 rounded-full ${bgClass} border-2 ${borderClass} shadow-lg text-white font-bold text-sm transform -translate-x-1/2 -translate-y-1/2">
        ${number}
      </div>
    `;

    return L.divIcon({
      html: html,
      className: "bg-transparent",
      iconSize: [32, 32],
      iconAnchor: [16, 16], // Center anchor
    });
  };

  // Draw polyline connecting the stops in order
  const positions = huntStops.map(stop => [stop.lat, stop.lng]);
  const hasMapboxRoute = MAPBOX_ROUTE_ENABLED && routeCoords && routeCoords.length >= 2;

  return (
    <>
      {/* The Line */}
      {hasMapboxRoute ? (
        <Polyline 
          positions={routeCoords}
          pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }} 
        />
      ) : (
        <Polyline 
          positions={positions}
          pathOptions={{ color: '#d97706', weight: 4, dashArray: '10, 10', opacity: 0.8 }} 
        />
      )}

      {/* The Stops */}
      {huntStops.map((stop, index) => (
        <Marker
          key={`hunt-stop-${stop.id}`}
          position={[stop.lat, stop.lng]}
          icon={createNumberedIcon(index + 1, stop.huntStatus)}
          zIndexOffset={1000 + index} // Ensure they are on top
        >
          <Tooltip direction="top" offset={[0, -16]} opacity={1}>
            <span className="font-bold">{index + 1}. {stop.title}</span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}