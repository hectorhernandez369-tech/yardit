import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";

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

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco fallback
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
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address || {};

      const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const state = addr.state || "";
      const zip = addr.postcode || "";
      const formatted = data.display_name || "Approximate Yard Sale Location";

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
      // Geocode failed — still allow submission with coords only
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
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
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