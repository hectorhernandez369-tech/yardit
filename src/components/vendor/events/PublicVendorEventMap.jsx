import { Circle, MapContainer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";

export default function PublicVendorEventMap({ event, spots = [] }) {
  const center = [event.latitude, event.longitude];
  const showRadius = ["multi_spot", "multi_location"].includes(event.event_type);

  return (
    <div className="space-y-3">
      <div className="h-[320px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
        <MapContainer center={center} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
          <VendorEventMapboxTileLayer />
          {showRadius && <Circle center={center} radius={Number(event.radius_feet || 500) * 0.3048} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.1, weight: 2 }} />}
          <Marker position={center} />
          {spots.map((spot) => (
            <Marker key={spot.id} position={[spot.latitude, spot.longitude]} />
          ))}
        </MapContainer>
      </div>
      <p className="text-sm text-slate-700">{event.display_address || "Location details coming soon"}</p>
    </div>
  );
}