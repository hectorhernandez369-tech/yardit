import React, { useEffect } from 'react';
import { useMap, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useHunt, HUNT_ENABLED } from './HuntContext';

const createNumberedIcon = (number, status) => {
  const color = status === 'completed' ? '#10b981' : status === 'arrived' ? '#3b82f6' : '#f59e0b';

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    className: 'hunt-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function HuntMapOverlay() {
  const hunt = useHunt();
  const map = useMap();

  const huntStops = hunt?.huntStops || [];
  const huntMode = hunt?.huntMode || false;
  const gpsLocation = hunt?.gpsLocation || null;

  useEffect(() => {
    if (!HUNT_ENABLED || !huntMode || huntStops.length === 0) return;
    const bounds = L.latLngBounds(huntStops.map((stop) => [stop.lat, stop.lng]));
    if (gpsLocation) {
      bounds.extend([gpsLocation.lat, gpsLocation.lng]);
    }
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [gpsLocation, huntMode, huntStops, map]);

  if (!HUNT_ENABLED || !huntMode) return null;

  const positions = huntStops.map((stop) => [stop.lat, stop.lng]);

  return (
    <>
      {positions.length > 1 && (
        <Polyline positions={positions} color="#f59e0b" weight={4} opacity={0.8} dashArray="10, 10" />
      )}

      {huntStops.map((stop, index) => (
        <Marker
          key={`hunt-stop-${stop.id}`}
          position={[stop.lat, stop.lng]}
          icon={createNumberedIcon(index + 1, stop.huntStatus)}
          zIndexOffset={1000}
        >
          <Tooltip direction="top" offset={[0, -12]} opacity={1}>
            <span className="font-bold">{stop.title}</span>
          </Tooltip>
        </Marker>
      ))}

      {gpsLocation && (
        <Marker
          position={[gpsLocation.lat, gpsLocation.lng]}
          icon={L.divIcon({
            html: '<div style="width: 12px; height: 12px; background: #3b82f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);"></div>',
            className: 'gps-dot',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })}
          zIndexOffset={2000}
        />
      )}
    </>
  );
}