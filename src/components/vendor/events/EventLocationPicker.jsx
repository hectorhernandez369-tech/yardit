import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import VendorEventMapboxTileLayer from "./VendorEventMapboxTileLayer";
import EventFlagPlacementModal from "./EventFlagPlacementModal";
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
  return [
    p.name,
    p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street,
    p.city || p.county,
    p.state,
    p.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Improved reverse geocode: prefers named place/venue over raw street address.
 * Uses Nominatim with addressdetails + namedetails.
 * Returns: { suggestedAddress, namedPlace }
 */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&namedetails=1`
    );
    const data = await res.json();
    if (!data || data.error) return { suggestedAddress: null, namedPlace: null };

    const a = data.address || {};
    const name = data.namedetails?.name || data.name || null;

    // Named place: amenity, tourism, leisure, building, shop, etc.
    const isNamedPlace = !!(
      a.amenity || a.tourism || a.leisure || a.building || a.shop ||
      a.office || a.historic || a.aeroway || a.man_made || a.landuse
    );

    // Clean street address
    const streetParts = [
      a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
      a.city || a.town || a.village || a.county,
      a.state,
    ].filter(Boolean);

    const streetAddress = streetParts.length >= 2 ? streetParts.join(", ") : null;

    // For named places: "Place Name, City, State"
    const namedPlaceParts = [
      name || a.amenity || a.tourism || a.leisure || a.building,
      a.city || a.town || a.village || a.county,
      a.state,
    ].filter(Boolean);

    const namedPlaceAddress = isNamedPlace && namedPlaceParts.length >= 2
      ? namedPlaceParts.join(", ")
      : null;

    const suggestedAddress = namedPlaceAddress || streetAddress || null;
    const namedPlace = (isNamedPlace && name) ? name : null;

    return { suggestedAddress, namedPlace };
  } catch {
    return { suggestedAddress: null, namedPlace: null };
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
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8${viewBox}&q=${enc}`).then((r) => r.json()),
  ]);

  const photonSuggestions =
    photonResult.status === "fulfilled"
      ? (photonResult.value.features || []).map((f) => {
          const [lng, lat] = f.geometry.coordinates;
          return { latitude: Number(lat), longitude: Number(lng), address: formatPhotonAddress(f.properties) };
        })
      : [];

  const nominatimSuggestions =
    nominatimResult.status === "fulfilled"
      ? (nominatimResult.value || []).map((r) => ({
          latitude: Number(r.lat),
          longitude: Number(r.lon),
          address: r.display_name,
        }))
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
      return (
        distanceFrom(a.latitude, a.longitude, biasCenter[0], biasCenter[1]) -
        distanceFrom(b.latitude, b.longitude, biasCenter[0], biasCenter[1])
      );
    })
    .slice(0, 6);
}

function LocationClickHandler({ onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
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
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  const hasValidValue = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);

  const [selected, setSelected] = useState(hasValidValue ? { latitude: value.latitude, longitude: value.longitude } : null);
  // geocoded_address = system suggested (internal reference)
  const [geocodedAddress, setGeocodedAddress] = useState(value?.geocoded_address || "");
  // displayAddress = what customers see (always editable)
  const [displayAddress, setDisplayAddress] = useState(value?.display_address || value?.geocoded_address || "");
  // track whether user has manually edited displayAddress so we don't overwrite it on re-geocode
  const [userEditedDisplay, setUserEditedDisplay] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const [radius, setRadius] = useState(value?.radius_feet || 500);
  const [flags, setFlags] = useState(value?.flags || []);
  const [showFlagPlacement, setShowFlagPlacement] = useState(false);
  const [mapStyle, setMapStyle] = useState("standard");

  const showRadius = eventType === "multi_spot" || eventType === "multi_location";
  const showSuggestions = searchFocused && searchQuery.trim().length >= 3 && (addressSuggestions.length > 0 || searching);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    const hasValid = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
    const geo = value?.geocoded_address || "";
    const disp = value?.display_address || geo;

    setSelected(hasValid ? { latitude: value.latitude, longitude: value.longitude } : null);
    setGeocodedAddress(geo);
    setDisplayAddress(disp);
    setUserEditedDisplay(false);
    setSearchQuery("");
    setAddressSuggestions([]);
    setSearchFocused(false);
    setRadius(value?.radius_feet || 500);
    setFlags(value?.flags || []);
    setMapStyle("standard");
  }, [open]); // intentionally not including value to avoid re-reset mid-session

  // Get user GPS for search bias
  useEffect(() => {
    if (!open || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserCoords([pos.coords.latitude, pos.coords.longitude]);
    });
  }, [open]);

  // Close suggestions on outside click
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

  // Search suggestions
  useEffect(() => {
    if (!open || !searchFocused || searchQuery.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const biasCenter = selected
        ? [selected.latitude, selected.longitude]
        : userCoords || DEFAULT_CENTER;
      const results = await geocodeAddress(searchQuery.trim(), biasCenter);
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

  // Pin drop on map — reverse geocode, never touch search bar
  const selectMapLocation = async (lat, lng) => {
    closeSuggestions();
    setSelected({ latitude: lat, longitude: lng });
    setGeocoding(true);
    const { suggestedAddress } = await reverseGeocode(lat, lng);
    const geo = suggestedAddress || "";
    setGeocodedAddress(geo);
    // Only auto-fill display if user hasn't manually typed something
    if (!userEditedDisplay) {
      setDisplayAddress(geo);
    }
    setGeocoding(false);
  };

  // Suggestion chosen from search dropdown
  const chooseSuggestion = (suggestion) => {
    const address = suggestion.address;
    setSelected({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    setGeocodedAddress(address);
    if (!userEditedDisplay) setDisplayAddress(address);
    setSearchQuery(address);
    closeSuggestions();
  };

  const saveLocation = () => {
    if (!selected) return;
    onChange({
      latitude: selected.latitude,
      longitude: selected.longitude,
      geocoded_address: geocodedAddress,
      display_address: displayAddress.trim() || geocodedAddress,
      radius_feet: Number(radius || 500),
      flags,
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
        </DialogHeader>
        <div className="space-y-4">
          {/* Search bar — search only, does not update after map tap */}
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

          {/* Map */}
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant={mapStyle === "standard" ? "default" : "outline"} onClick={() => setMapStyle("standard")}>Standard</Button>
              <Button type="button" size="sm" variant={mapStyle === "satellite" ? "default" : "outline"} onClick={() => setMapStyle("satellite")}>Satellite</Button>
            </div>
            <div className="h-[360px] overflow-hidden rounded-2xl border border-[#2C4F4E]/20">
              <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
                <VendorEventMapboxTileLayer mapStyle={mapStyle} />
                <RecenterMap center={center} />
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
            {!selected && (
              <p className="text-xs text-slate-500 text-center">Tap the map or search above to set the event location.</p>
            )}
          </div>

          {/* Location fields — always shown once a pin is selected */}
          {selected && (
            <div className="space-y-3 rounded-xl bg-[#FBFAF7] border border-[#2C4F4E]/10 p-4">
              {/* Suggested Address (system, read-only) */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 font-normal uppercase tracking-wide">Suggested Address</Label>
                <p className="text-sm text-slate-700">
                  {geocoding ? (
                    <span className="text-slate-400 italic">Looking up address…</span>
                  ) : (
                    geocodedAddress || <span className="text-slate-400 italic">Location selected</span>
                  )}
                </p>
              </div>

              <div className="h-px bg-[#2C4F4E]/10" />

              {/* Public Display Location (always editable) */}
              <div className="space-y-1.5">
                <Label>Public Display Location</Label>
                <Input
                  value={displayAddress}
                  onChange={(e) => {
                    setDisplayAddress(e.target.value);
                    setUserEditedDisplay(true);
                  }}
                  placeholder="e.g. Porterville Courthouse, Main Parking Lot, Field 2 Entrance"
                />
                <p className="text-xs text-slate-500">
                  This is what customers will see. Directions still use the map pin.
                </p>
              </div>
            </div>
          )}

          {/* Radius & Flags */}
          {showRadius && (
            <div className="space-y-2 rounded-xl bg-[#FBFAF7] p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Event Area Radius</Label>
                <span className="text-sm font-bold text-[#2C4F4E]">{radius} ft</span>
              </div>
              <input
                className="w-full accent-[#5DADA5]"
                type="range"
                min="100"
                max="5000"
                step="100"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
              <p className="text-xs text-slate-600">Spots/fields must be placed inside this circle.</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="button" variant="outline" disabled={!selected} onClick={() => setShowFlagPlacement(true)}>
                  Add Flags
                </Button>
                {flags.length > 0 && (
                  <span className="text-sm font-semibold text-[#2C4F4E]">{flags.length} flags selected</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={!selected}
              onClick={saveLocation}
              className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"
            >
              Save Location
            </Button>
          </div>
        </div>

        {selected && showRadius && (
          <EventFlagPlacementModal
            open={showFlagPlacement}
            onOpenChange={setShowFlagPlacement}
            eventLocation={{ latitude: selected.latitude, longitude: selected.longitude, radius_feet: Number(radius || 500) }}
            flags={flags}
            onSave={setFlags}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}