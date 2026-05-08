import { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [34.0522, -118.2437];

function distanceFrom(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPhotonAddress(properties) {
  return [properties.name, properties.housenumber && properties.street ? `${properties.housenumber} ${properties.street}` : properties.street, properties.city || properties.county, properties.state, properties.postcode]
    .filter(Boolean)
    .join(", ");
}

async function reverseGeocode(lat, lng) {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
  const data = await response.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function geocodeAddress(address, biasCenter) {
  const encodedAddress = encodeURIComponent(address);
  const photonBias = biasCenter ? `&lat=${biasCenter[0]}&lon=${biasCenter[1]}` : "";
  const viewBox = biasCenter ? `&viewbox=${biasCenter[1] - 0.8},${biasCenter[0] + 0.8},${biasCenter[1] + 0.8},${biasCenter[0] - 0.8}` : "";
  const [photonResult, nominatimResult] = await Promise.allSettled([
    fetch(`https://photon.komoot.io/api/?q=${encodedAddress}&limit=8${photonBias}`).then((response) => response.json()),
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8${viewBox}&q=${encodedAddress}`).then((response) => response.json()),
  ]);

  const photonSuggestions = photonResult.status === "fulfilled" ? (photonResult.value.features || []).map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const addressText = formatPhotonAddress(feature.properties);
    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
      geocoded_address: addressText,
      display_address: addressText,
    };
  }) : [];

  const nominatimSuggestions = nominatimResult.status === "fulfilled" ? (nominatimResult.value || []).map((result) => ({
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    geocoded_address: result.display_name,
    display_address: result.display_name,
  })) : [];

  const seen = new Set();
  return [...photonSuggestions, ...nominatimSuggestions]
    .filter((suggestion) => suggestion.display_address && Number.isFinite(suggestion.latitude) && Number.isFinite(suggestion.longitude))
    .filter((suggestion) => {
      const key = `${suggestion.display_address.toLowerCase()}-${suggestion.latitude.toFixed(4)}-${suggestion.longitude.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (!biasCenter) return 0;
      return distanceFrom(a.latitude, a.longitude, biasCenter[0], biasCenter[1]) - distanceFrom(b.latitude, b.longitude, biasCenter[0], biasCenter[1]);
    })
    .slice(0, 6);
}

function LocationClickHandler({ onSelect }) {
  useMapEvents({
    click: (event) => onSelect(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 14);
    setTimeout(() => map.invalidateSize(), 100);
  }, [center[0], center[1], map]);

  return null;
}

export default function EventLocationPicker({ open, onOpenChange, eventType, value, onChange }) {
  const hasValidValue = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
  const [selected, setSelected] = useState(hasValidValue ? value : null);
  const [radius, setRadius] = useState(value?.radius_feet || 500);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [displayAddressIsDifferent, setDisplayAddressIsDifferent] = useState(false);
  const [publicDisplayAddress, setPublicDisplayAddress] = useState("");
  const showRadius = eventType === "multi_spot" || eventType === "multi_location";

  useEffect(() => {
    if (open) {
      const hasValidOpenValue = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
      const currentLocation = hasValidOpenValue ? {
        ...value,
        geocoded_address: value.geocoded_address || value.display_address,
      } : null;
      const isCustomDisplay = !!currentLocation?.display_address && !!currentLocation?.geocoded_address && currentLocation.display_address !== currentLocation.geocoded_address;

      setSelected(currentLocation);
      setAddressQuery(currentLocation?.geocoded_address || "");
      setAddressSuggestions([]);
      setDisplayAddressIsDifferent(isCustomDisplay);
      setPublicDisplayAddress(isCustomDisplay ? currentLocation.display_address : "");
      setRadius(value?.radius_feet || 500);
    }
  }, [open, value]);

  const selectLocation = async (lat, lng) => {
    const displayAddress = await reverseGeocode(lat, lng);
    setSelected({
      latitude: lat,
      longitude: lng,
      geocoded_address: displayAddress,
      display_address: displayAddressIsDifferent && publicDisplayAddress.trim() ? publicDisplayAddress.trim() : displayAddress,
    });
    setAddressQuery(displayAddress);
    setAddressSuggestions([]);
    if (!displayAddressIsDifferent) setPublicDisplayAddress("");
  };

  const searchAddress = async () => {
    if (addressQuery.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setSearching(true);
    const biasCenter = selected ? [selected.latitude, selected.longitude] : userCoords || DEFAULT_CENTER;
    const results = await geocodeAddress(addressQuery.trim(), biasCenter);
    setAddressSuggestions(results);
    setSearching(false);
  };

  const chooseSuggestion = async (suggestion) => {
    const geocodedAddress = suggestion.geocoded_address || suggestion.display_address || await reverseGeocode(suggestion.latitude, suggestion.longitude);
    setSelected({
      ...suggestion,
      geocoded_address: geocodedAddress,
      display_address: displayAddressIsDifferent && publicDisplayAddress.trim() ? publicDisplayAddress.trim() : geocodedAddress,
    });
    setAddressQuery(geocodedAddress);
    setAddressSuggestions([]);
    if (!displayAddressIsDifferent) setPublicDisplayAddress("");
  };

  useEffect(() => {
    if (!open || selected || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = [position.coords.latitude, position.coords.longitude];
      setUserCoords(coords);
      selectLocation(coords[0], coords[1]);
    });
  }, [open, selected]);

  useEffect(() => {
    if (!open || addressQuery.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchAddress();
    }, 350);

    return () => clearTimeout(timer);
  }, [addressQuery, open]);

  const saveLocation = () => {
    if (!selected) return;
    const geocodedAddress = selected.geocoded_address || selected.display_address;
    const displayAddress = displayAddressIsDifferent && publicDisplayAddress.trim()
      ? publicDisplayAddress.trim()
      : geocodedAddress;

    onChange({
      latitude: selected.latitude,
      longitude: selected.longitude,
      geocoded_address: geocodedAddress,
      display_address: displayAddress,
      radius_feet: Number(radius || 500),
    });
    onOpenChange(false);
  };

  const center = selected ? [selected.latitude, selected.longitude] : DEFAULT_CENTER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Event Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              value={addressQuery}
              onChange={(e) => {
                setAddressQuery(e.target.value);
                if (e.target.value.trim().length < 3) setAddressSuggestions([]);
              }}
              placeholder="Search address, venue, park, school, or business"
            />
            {(addressSuggestions.length > 0 || searching) && (
              <div className="rounded-xl border border-[#2C4F4E]/15 bg-white shadow-sm overflow-hidden">
                {searching && addressSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">Finding nearby suggestions...</div>
                )}
                {addressSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                    type="button"
                    onClick={() => chooseSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-[#FBFAF7] border-b last:border-b-0"
                  >
                    {suggestion.display_address}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="h-[360px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
            <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RecenterMap center={center} />
              <LocationClickHandler onSelect={selectLocation} />
              {selected && showRadius && <Circle center={[selected.latitude, selected.longitude]} radius={Number(radius || 500) * 0.3048} pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.12, weight: 2 }} />}
              {selected && <Marker position={[selected.latitude, selected.longitude]} />}
            </MapContainer>
          </div>
          {selected && (
            <div className="space-y-3 rounded-xl bg-[#FBFAF7] p-3">
              <label className="flex items-start gap-2 text-sm font-medium text-[#2C4F4E]">
                <input
                  type="checkbox"
                  checked={displayAddressIsDifferent}
                  onChange={(e) => {
                    setDisplayAddressIsDifferent(e.target.checked);
                    if (!e.target.checked) setPublicDisplayAddress("");
                  }}
                  className="mt-1 accent-[#5DADA5]"
                />
                <span>
                  Display address is different
                  <span className="block text-xs font-normal text-slate-600">
                    This means the public address shown to users can be different from the exact pin/navigation location.
                  </span>
                </span>
              </label>
              {displayAddressIsDifferent && (
                <div className="space-y-1">
                  <Label>Public Display Address</Label>
                  <Input
                    value={publicDisplayAddress}
                    onChange={(e) => setPublicDisplayAddress(e.target.value)}
                    placeholder="Enter the address customers should see"
                  />
                  <p className="text-xs text-slate-600">Customers will see this address, but directions will still use the map pin location.</p>
                </div>
              )}
            </div>
          )}
          {showRadius && (
            <div className="space-y-2 rounded-xl bg-[#FBFAF7] p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Event Area Radius</Label>
                <span className="text-sm font-bold text-[#2C4F4E]">{radius} ft</span>
              </div>
              <input className="w-full accent-[#5DADA5]" type="range" min="100" max="5000" step="100" value={radius} onChange={(e) => setRadius(e.target.value)} />
              <p className="text-xs text-slate-600">Spots/fields must be placed inside this circle.</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!selected} onClick={saveLocation} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Save Location</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}