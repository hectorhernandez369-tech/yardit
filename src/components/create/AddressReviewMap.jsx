import React, { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [37.7749, -122.4194];
const MAPBOX_URL = "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

function RecenterMap({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

export default function AddressReviewMap({ lat, lng }) {
  const hasCoordinates = typeof lat === "number" && typeof lng === "number";
  const center = hasCoordinates ? [lat, lng] : DEFAULT_CENTER;
  const zoom = hasCoordinates ? 15 : 4;

  return (
    <div className="space-y-2">
      <div className="h-72 overflow-hidden rounded-xl border-2 border-[#2C4F4E]">
        <MapContainer
          center={center}
          zoom={zoom}
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
          <RecenterMap center={center} zoom={zoom} />
          {hasCoordinates && (
            <Marker position={[lat, lng]} />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-[#1F2937] opacity-80">
        Map preview for your confirmed listing location.
      </p>
    </div>
  );
}