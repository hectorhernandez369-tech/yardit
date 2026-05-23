import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
const MAPBOX_URL = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;

// Fix Leaflet default icon broken in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PIN_ICON = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const DEFAULT_CENTER = [37.7749, -122.4194];
const DEFAULT_ZOOM = 14;

export default function AdminPinDropMap({ onLocationSelected }) {
  const [pinLatLng, setPinLatLng] = useState(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [geocodedLabel, setGeocodedLabel] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [geoLocating, setGeoLocating] = useState(false);
  const geocodeTimeout = useRef(null);

  // Try to get user's current location for map center
  useEffect(() => {
    setGeoLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setGeoLocating(false);
      },
      () => setGeoLocating(false),
      { timeout: 5000 }
    );
  }, []);

  const reverseGeocode = async (lat, lng) => {
    setIsReverseGeocoding(true);
    setGeocodedLabel(null);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address&limit=1`
      );
      const data = await res.json();
      const feature = data.features?.[0];

      let street = null, city = "", state = "", zip = "";

      if (feature) {
        // Mapbox place_name is the full formatted address
        const context = feature.context || [];
        street = feature.text || null;
        const addressNumber = feature.address || "";
        if (street && addressNumber) street = `${addressNumber} ${street}`;

        for (const ctx of context) {
          if (ctx.id.startsWith("postcode")) zip = ctx.text;
          else if (ctx.id.startsWith("place")) city = ctx.text;
          else if (ctx.id.startsWith("region")) state = ctx.short_code?.replace("US-", "") || ctx.text;
        }
      }

      const hasFullAddress = !!(street && city && state && zip);
      const result = {
        lat,
        lng,
        street: street || null,
        city,
        state,
        zip,
        formatted: hasFullAddress ? `${street}, ${city}, ${state} ${zip}` : "Approximate Yard Sale Location",
        hasFullAddress,
        location_source: "map_pin",
      };

      setGeocodedLabel(result.formatted);
      onLocationSelected(result);
    } catch {
      const fallback = {
        lat,
        lng,
        street: null,
        city: "",
        state: "",
        zip: "",
        formatted: "Approximate Yard Sale Location",
        hasFullAddress: false,
        location_source: "map_pin",
      };
      setGeocodedLabel("Approximate Yard Sale Location");
      onLocationSelected(fallback);
    }
    setIsReverseGeocoding(false);
  };

  const handleMapClick = (latlng) => {
    setPinLatLng(latlng);
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(() => {
      reverseGeocode(latlng.lat, latlng.lng);
    }, 300);
  };

  return (
    <div className="space-y-2">
      {geoLocating && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Finding your location…
        </p>
      )}

      <div className="rounded-xl overflow-hidden border border-slate-300 shadow-sm" style={{ height: 320 }}>
        <MapContainer
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          key={mapCenter.join(",")}
        >
          <TileLayer
            url={MAPBOX_URL}
            attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            tileSize={512}
            zoomOffset={-1}
          />
          <RecenterMap center={mapCenter} />
          <ClickHandler onMapClick={handleMapClick} />
          {pinLatLng && <Marker position={pinLatLng} icon={PIN_ICON} />}
        </MapContainer>
      </div>

      <div className="min-h-[36px] flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
        {isReverseGeocoding ? (
          <><Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" /><span className="text-slate-500">Looking up address…</span></>
        ) : pinLatLng ? (
          <><MapPin className="w-4 h-4 text-[#5DADA5] flex-shrink-0" /><span className="text-slate-700">{geocodedLabel || "Approximate Yard Sale Location"}</span></>
        ) : (
          <span className="text-slate-400 italic">Tap the map to drop a pin at the yard sale location</span>
        )}
      </div>
    </div>
  );
}