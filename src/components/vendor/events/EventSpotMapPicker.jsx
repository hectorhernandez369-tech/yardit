import { useEffect } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { calculateMiles } from "@/lib/vendorEvents";
import { toast } from "sonner";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";
import AreaShapeViews from "./AreaShapeViews";

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 15);
    setTimeout(() => map.invalidateSize(), 100);
  }, [center[0], center[1], map]);

  return null;
}

function SpotClickHandler({ event, onSelect }) {
  useMapEvents({
    click: (mapEvent) => {
      const lat = mapEvent.latlng.lat;
      const lng = mapEvent.latlng.lng;
      const miles = calculateMiles(event.latitude, event.longitude, lat, lng);
      const radiusMiles = Number(event.radius_feet || 0) / 5280;

      if (miles !== null && radiusMiles > 0 && miles > radiusMiles) {
        toast.error("Spot must be inside the event area.");
        return;
      }

      onSelect({ latitude: lat, longitude: lng });
    },
  });

  return null;
}

export default function EventSpotMapPicker({ event, value, onChange }) {
  const center = [event.latitude, event.longitude];
  const radiusMeters = Number(event.radius_feet || 500) * 0.3048;

  return (
    <div className="h-[320px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
      <MapContainer center={center} zoom={15} className="h-full w-full" scrollWheelZoom>
        <VendorEventMapboxTileLayer />
        <RecenterMap center={center} />
        <Circle center={center} radius={radiusMeters} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.12, weight: 2 }} />
        <Marker position={center} />
        <AreaShapeViews shapes={event?.highlights || []} />
        {value?.latitude && value?.longitude && <Marker position={[Number(value.latitude), Number(value.longitude)]} />}
        <SpotClickHandler event={event} onSelect={onChange} />
      </MapContainer>
    </div>
  );
}