import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [34.0522, -118.2437];

async function reverseGeocode(lat, lng) {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
  const data = await response.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function geocodeAddress(address) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(address)}`);
  const data = await response.json();
  return (data || []).map((result) => ({
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    geocoded_address: result.display_name,
    display_address: result.display_name,
  }));
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
    setSelected({ latitude: lat, longitude: lng, geocoded_address: displayAddress, display_address: displayAddress });
    setAddressQuery(displayAddress);
    setAddressSuggestions([]);
    if (!displayAddressIsDifferent) setPublicDisplayAddress("");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      selectLocation(position.coords.latitude, position.coords.longitude);
    });
  };

  const searchAddress = async () => {
    if (addressQuery.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setSearching(true);
    const results = await geocodeAddress(addressQuery.trim());
    setAddressSuggestions(results);
    setSearching(false);
  };

  const chooseSuggestion = async (suggestion) => {
    const geocodedAddress = suggestion.geocoded_address || suggestion.display_address || await reverseGeocode(suggestion.latitude, suggestion.longitude);
    setSelected({ ...suggestion, geocoded_address: geocodedAddress, display_address: geocodedAddress });
    setAddressQuery(geocodedAddress);
    setAddressSuggestions([]);
    if (!displayAddressIsDifferent) setPublicDisplayAddress("");
  };

  useEffect(() => {
    if (!open || selected || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      selectLocation(position.coords.latitude, position.coords.longitude);
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  if (e.target.value.trim().length < 3) setAddressSuggestions([]);
                }}
                onKeyDown={(e) => e.key === "Enter" && searchAddress()}
                placeholder="Search address, city, or place"
              />
              <Button type="button" variant="outline" disabled={searching} onClick={searchAddress}>{searching ? "Searching..." : "Search"}</Button>
              <Button type="button" variant="outline" onClick={useMyLocation}>Use My Location</Button>
            </div>
            {addressSuggestions.length > 0 && (
              <div className="rounded-xl border border-[#2C4F4E]/15 bg-white shadow-sm overflow-hidden">
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
              {selected && <Marker position={[selected.latitude, selected.longitude]} />}
            </MapContainer>
          </div>
          {selected?.geocoded_address && (
            <div className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700">
              <strong>Selected pin location:</strong> {selected.geocoded_address}
            </div>
          )}
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
              <p className="text-xs text-slate-600">This controls how far away spots/fields can be added from the main event location.</p>
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