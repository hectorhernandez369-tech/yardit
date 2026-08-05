import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [34.0522, -118.2437];

function distanceFrom(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPhotonAddress(p) {
  const name = p.name;
  const street = p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street;
  const city = p.city || p.town || p.village || p.county;
  const state = p.state;
  if (name && city) return [name, city, state].filter(Boolean).join(", ");
  return [street, city, state].filter(Boolean).join(", ");
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&namedetails=1`
    );
    const data = await res.json();
    if (!data || data.error) return null;
    const a = data.address || {};
    const placeName = data.name || data.namedetails?.name;
    if (placeName) {
      const city = a.city || a.town || a.village || a.county;
      const state = a.state;
      return [placeName, city, state].filter(Boolean).join(", ");
    }
    const street = a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road;
    const city = a.city || a.town || a.village || a.county;
    const state = a.state;
    if (street && city) return [street, city, state].filter(Boolean).join(", ");
    if (city && state) return [city, state].join(", ");
    return null;
  } catch {
    return null;
  }
}

async function geocodeAddress(address, biasCenter) {
  const enc = encodeURIComponent(address);
  const photonBias = biasCenter ? `&lat=${biasCenter[0]}&lon=${biasCenter[1]}` : "";
  const viewBox = biasCenter
    ? `&viewbox=${biasCenter[1] - 0.8},${biasCenter[0] + 0.8},${biasCenter[1] + 0.8},${biasCenter[0] - 0.8}`
    : "";

  const [photonResult, nominatimResult] = await Promise.allSettled([
    fetch(`https://photon.komoot.io/api/?q=${enc}&limit=8${photonBias}`).then((r) => r.json()),
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&limit=8${viewBox}&q=${enc}`).then((r) => r.json()),
  ]);

  const photonSuggestions =
    photonResult.status === "fulfilled"
      ? (photonResult.value.features || []).map((f) => {
          const [longitude, latitude] = f.geometry.coordinates;
          return { latitude: Number(latitude), longitude: Number(longitude), address: formatPhotonAddress(f.properties) };
        })
      : [];

  const nominatimSuggestions =
    nominatimResult.status === "fulfilled"
      ? (nominatimResult.value || []).map((r) => {
          const name = r.namedetails?.name || r.name;
          const a = r.address || {};
          const city = a.city || a.town || a.village || a.county;
          const state = a.state;
          const street = a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road;
          const label = name && city ? [name, city, state].filter(Boolean).join(", ") : [street, city, state].filter(Boolean).join(", ") || r.display_name;
          return { latitude: Number(r.lat), longitude: Number(r.lon), address: label };
        })
      : [];

  const seen = new Set();
  return [...photonSuggestions, ...nominatimSuggestions]
    .filter((s) => s.address && Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
    .filter((s) => {
      const key = `${s.address.toLowerCase()}-${s.latitude.toFixed(4)}-${s.longitude.toFixed(4)}`;
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
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

function RecenterMap({ center, recenterZoom, currentZoomRef }) {
  const map = useMap();
  useMapEvents({
    zoomend: () => { if (currentZoomRef) currentZoomRef.current = map.getZoom(); },
  });
  useEffect(() => {
    if (recenterZoom != null) {
      map.setView(center, recenterZoom, { animate: true });
    } else {
      const bounds = map.getBounds();
      if (!bounds.contains({ lat: center[0], lng: center[1] })) {
        map.panTo(center, { animate: true });
      }
    }
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [center[0], center[1], recenterZoom, map]);
  return null;
}

export default function EventLocationPicker({ open, onOpenChange, eventType, value, onChange }) {
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);
  const currentZoomRef = useRef(13);
  const [recenterZoom, setRecenterZoom] = useState(null);

  const hasValidValue = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);

  const [selected, setSelected] = useState(hasValidValue ? { latitude: value.latitude, longitude: value.longitude } : null);
  const [geocodedAddress, setGeocodedAddress] = useState(value?.geocoded_address || "");
  const [displayAddress, setDisplayAddress] = useState(value?.display_address || value?.geocoded_address || "");
  const [displayAddressEdited, setDisplayAddressEdited] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  const [radius, setRadius] = useState(value?.radius_feet || 500);
  const [mapStyle, setMapStyle] = useState("standard");

  const showRadius = eventType === "multi_spot" || eventType === "multi_location";
  const showSuggestions = searchFocused && searchQuery.trim().length >= 3 && (addressSuggestions.length > 0 || searching);

  useEffect(() => {
    if (!open) return;
    const hasValid = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
    const geo = value?.geocoded_address || "";
    const disp = value?.display_address || geo;
    setSelected(hasValid ? { latitude: value.latitude, longitude: value.longitude } : null);
    setGeocodedAddress(geo);
    setDisplayAddress(disp);
    setDisplayAddressEdited(!!disp && disp !== geo);
    setSearchQuery("");
    setAddressSuggestions([]);
    setSearchFocused(false);
    setRadius(value?.radius_feet || 500);
    setMapStyle("standard");
    setRecenterZoom(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserCoords([pos.coords.latitude, pos.coords.longitude]);
    });
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchFocused(false);
        setAddressSuggestions([]);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    if (!open || !searchFocused || searchQuery.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const bias = selected ? [selected.latitude, selected.longitude] : userCoords || DEFAULT_CENTER;
      const results = await geocodeAddress(searchQuery.trim(), bias);
      setAddressSuggestions(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, searchFocused, open, selected?.latitude, selected?.longitude, userCoords]);

  const closeSuggestions = () => {
    setSearchFocused(false);
    setAddressSuggestions([]);
    searchInputRef.current?.blur();
  };

  const selectMapLocation = async (lat, lng) => {
    setSelected({ latitude: lat, longitude: lng });
    setRecenterZoom(null);
    setReverseGeocoding(true);
    const address = await reverseGeocode(lat, lng);
    const suggested = address || "Location selected";
    setGeocodedAddress(suggested);
    if (!displayAddressEdited) setDisplayAddress(suggested);
    setReverseGeocoding(false);
  };

  const chooseSuggestion = (suggestion) => {
    setSelected({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    setRecenterZoom(Math.max(currentZoomRef.current || 15, 15));
    setGeocodedAddress(suggestion.address);
    if (!displayAddressEdited) setDisplayAddress(suggestion.address);
    setSearchQuery(suggestion.address);
    closeSuggestions();
  };

  const handleDisplayAddressChange = (e) => {
    setDisplayAddress(e.target.value);
    setDisplayAddressEdited(true);
  };

  const saveLocation = () => {
    if (!selected) return;
    onChange({
      latitude: selected.latitude,
      longitude: selected.longitude,
      geocoded_address: geocodedAddress,
      display_address: displayAddress.trim() || geocodedAddress,
      radius_feet: Number(radius || 500),
    });
    closeSuggestions();
    onOpenChange(false);
  };

  const center = selected ? [selected.latitude, selected.longitude] : DEFAULT_CENTER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Event Location</DialogTitle>
          <p className="text-sm text-slate-500">Where is your event located? Add flags and highlighted areas later in Event Map Setup.</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Address search */}
          <div ref={searchWrapRef} className="space-y-2">
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
                if (e.target.value.trim().length < 3) setAddressSuggestions([]);
              }}
              placeholder="Search address, venue, park, school, or business"
            />
            {showSuggestions && (
              <div className="rounded-xl border border-[#2C4F4E]/15 bg-white shadow-sm overflow-hidden">
                {searching && addressSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">Finding nearby suggestions...</div>
                )}
                {addressSuggestions.map((s, i) => (
                  <button
                    key={`${s.latitude}-${s.longitude}-${i}`}
                    type="button"
                    onClick={() => chooseSuggestion(s)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-[#FBFAF7] border-b last:border-b-0"
                  >
                    {s.address}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive map + main pin */}
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant={mapStyle === "standard" ? "default" : "outline"} onClick={() => setMapStyle("standard")}>Standard</Button>
              <Button type="button" size="sm" variant={mapStyle === "satellite" ? "default" : "outline"} onClick={() => setMapStyle("satellite")}>Satellite</Button>
            </div>
            <div className="relative h-[360px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
              <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
                <VendorEventMapboxTileLayer mapStyle={mapStyle} />
                <RecenterMap center={center} recenterZoom={recenterZoom} currentZoomRef={currentZoomRef} />
                <LocationClickHandler onSelect={selectMapLocation} />
                {selected && showRadius && (
                  <Circle
                    center={[selected.latitude, selected.longitude]}
                    radius={Number(radius || 500) * 0.3048}
                    pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.12, weight: 2 }}
                  />
                )}
                {selected && <Marker position={[selected.latitude, selected.longitude]} />}
              </MapContainer>
            </div>
            <p className="text-center text-xs text-slate-500">Tap the map or search above to set the pin location.</p>
          </div>

          {/* Radius slider */}
          {showRadius && (
            <div className="space-y-2 rounded-xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Event Area Radius</Label>
                <span className="text-sm font-bold text-[#2C4F4E]">{radius} ft</span>
              </div>
              <input
                className="w-full accent-[#5DADA5]"
                type="range" min="100" max="5000" step="100"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
              <p className="text-xs text-slate-600">Spots/fields must be placed inside this circle.</p>
            </div>
          )}

          {/* Suggested address + Public display location */}
          {selected && (
            <div className="space-y-3 rounded-xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Suggested Address</p>
                <p className="text-sm text-slate-700">
                  {reverseGeocoding ? <span className="italic text-slate-400">Finding address...</span> : (geocodedAddress || "Location selected")}
                </p>
              </div>
              <div className="h-px bg-[#2C4F4E]/10" />
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[#2C4F4E]">Public Display Location</Label>
                <Input
                  value={displayAddress}
                  onChange={handleDisplayAddressChange}
                  placeholder="e.g. Porterville Courthouse, Main Parking Lot, Field 2 Entrance"
                />
                <p className="text-xs text-slate-500">This is what customers will see. Directions still use the map pin.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!selected} onClick={saveLocation} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">
              Save Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}