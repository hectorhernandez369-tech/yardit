import React from "react";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MAPBOX_URL = "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
const RADIUS_FEET = 500;
const RADIUS_METERS = RADIUS_FEET * 0.3048;

export default function NeighborhoodSalePreviewMap({ lat, lng }) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return (
    <div className="h-64 overflow-hidden rounded-xl border border-emerald-200">
      <MapContainer
        center={[lat, lng]}
        zoom={17}
        className="h-full w-full"
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={MAPBOX_URL}
          tileSize={512}
          zoomOffset={-1}
        />
        <Marker position={[lat, lng]} />
        <Circle
          center={[lat, lng]}
          radius={RADIUS_METERS}
          pathOptions={{ color: "#059669", weight: 2, fillColor: "#10b981", fillOpacity: 0.12 }}
        />
      </MapContainer>
    </div>
  );
}