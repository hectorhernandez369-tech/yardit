import React from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useHunt, HUNT_ENABLED } from "@/components/hunt/HuntContext";
import { Card, CardContent } from "@/components/ui/card";
import { calculateTotalDistance } from "@/components/hunt/huntUtils";

export default function HuntMapLayers() {
  const { huntStops, huntMode: isHuntActive } = useHunt() || {};

  if (!HUNT_ENABLED || !isHuntActive || !huntStops || huntStops.length === 0) {
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

  return (
    <>
      {/* The Line */}
      <Polyline 
        positions={positions}
        pathOptions={{ color: '#d97706', weight: 4, dashArray: '10, 10', opacity: 0.8 }} 
      />

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

      {/* Hunt Mode Summary Overlay */}
      <div className="leaflet-top leaflet-center pointer-events-none" style={{ left: '50%', transform: 'translateX(-50%)', position: 'absolute', top: '10px', zIndex: 1000 }}>
         <Card className="bg-emerald-600 text-white border-2 border-emerald-800 shadow-xl pointer-events-auto">
           <CardContent className="p-3 flex items-center gap-4">
             <div className="text-center">
               <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Stops</p>
               <p className="text-xl font-bold leading-none">{huntStops.length}</p>
             </div>
             <div className="h-8 w-px bg-emerald-500/50" />
             <div className="text-center">
               <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Est. Dist</p>
               <p className="text-xl font-bold leading-none">{calculateTotalDistance(huntStops).toFixed(1)} <span className="text-sm font-normal">mi</span></p>
             </div>
           </CardContent>
         </Card>
      </div>
    </>
  );
}