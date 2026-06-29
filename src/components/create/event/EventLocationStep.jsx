import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { MapPin, Navigation, Loader2, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { buildResolvedListingLocation } from "@/lib/listingLocation";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
const DEFAULT_CENTER = [39.8283, -98.5795];

function parseFeature(feature) {
  let city = "";
  let state = "";
  let zip = "";

  feature?.context?.forEach((item) => {
    if (item.id.startsWith("place")) city = item.text;
    if (item.id.startsWith("region")) state = item.short_code?.split("-")?.[1] || item.text;
    if (item.id.startsWith("postcode")) zip = item.text;
  });

  return {
    lat: feature?.center?.[1],
    lng: feature?.center?.[0],
    address_text: feature?.place_name || "Selected event location",
    addressText: feature?.place_name || "Selected event location",
    city,
    state,
    zip,
  };
}

async function reverseGeocode(lat, lng) {
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`);
  const data = await response.json();
  return parseFeature(data.features?.[0]);
}

function MapEventsHandler({ onClick }) {
  useMapEvents({
    click(event) {
      onClick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function RecenterHandler({ center, zoom, trigger }) {
  const map = useMap();

  useEffect(() => {
    if (trigger > 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom, trigger, map]);

  return null;
}

function EventMapModal({ isOpen, onClose, onConfirm, initialLat, initialLng }) {
  const [selectedCenter, setSelectedCenter] = useState(initialLat && initialLng ? [initialLat, initialLng] : null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(4);
  const [isLocating, setIsLocating] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    if (initialLat && initialLng) {
      const coords = [initialLat, initialLng];
      setSelectedCenter(coords);
      setMapCenter(coords);
      setMapZoom(15);
      setRecenterTrigger((prev) => prev + 1);
      return;
    }

    setSelectedCenter(null);
    setMapCenter(DEFAULT_CENTER);
    setMapZoom(4);

    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setMapCenter(coords);
          setMapZoom(15);
          setRecenterTrigger((prev) => prev + 1);
          setIsLocating(false);
        },
        () => setIsLocating(false)
      );
    }
  }, [isOpen, initialLat, initialLng]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#F3E6CF] flex flex-col">
      <div className="bg-[#5DADA5] text-white p-4 flex items-center justify-between shadow-md">
        <h2 className="text-lg font-bold">Pick Event Center</h2>
        <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20">Close</Button>
      </div>

      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
            tileSize={512}
            zoomOffset={-1}
          />
          <MapEventsHandler onClick={setSelectedCenter} />
          <RecenterHandler center={mapCenter} zoom={mapZoom} trigger={recenterTrigger} />
          {selectedCenter && <Marker position={selectedCenter} />}
        </MapContainer>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-sm text-[#2C4F4E] font-medium border border-[#2C4F4E]/20">
          Tap the map to place center
        </div>

        <div className="absolute bottom-[calc(2rem_+_var(--yardit-safe-area-bottom))] left-1/2 -translate-x-1/2 z-[1000] flex gap-3 w-[90%] max-w-sm">
          <Button
            variant="outline"
            className="flex-1 bg-white text-[#2C4F4E] border-[#2C4F4E] shadow-lg hover:bg-gray-50"
            onClick={() => {
              if (!navigator.geolocation) return;
              setIsLocating(true);
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const coords = [position.coords.latitude, position.coords.longitude];
                  setMapCenter(coords);
                  setMapZoom(16);
                  setRecenterTrigger((prev) => prev + 1);
                  setSelectedCenter(coords);
                  setIsLocating(false);
                },
                () => setIsLocating(false)
              );
            }}
          >
            {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
            {isLocating ? "" : "My Location"}
          </Button>
          <Button
            className="flex-1 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E] shadow-lg font-bold"
            disabled={!selectedCenter}
            onClick={() => onConfirm(selectedCenter[0], selectedCenter[1])}
          >
            Confirm Center
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EventLocationStep({ formData, setFormData }) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState(formData.address_text || formData.addressText || "");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (formData.location_source !== "pin") {
      setAddressQuery(formData.display_address || formData.address_text || formData.addressText || "");
    }
  }, []);

  useEffect(() => {
    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`);
        const data = await response.json();
        setAddressSuggestions(data.features || []);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [addressQuery]);

  const applyLocation = (location) => {
    setFormData((prev) => buildResolvedListingLocation({
      ...prev,
      lat: location.lat,
      lng: location.lng,
      address_text: location.address_text,
      addressText: location.addressText,
      city: location.city || prev.city,
      state: location.state || prev.state,
      zip: location.zip || prev.zip,
      display_address: location.display_address !== undefined ? location.display_address : prev.display_address,
      geocoded_address: location.geocoded_address !== undefined ? location.geocoded_address : prev.geocoded_address,
      location_source: location.location_source || prev.location_source
    }));
  };

  const handleSelectSuggestion = (feature) => {
    const nextLocation = parseFeature(feature);
    const selectedAddress = nextLocation.address_text;
    
    console.log("[LOCATION DEBUG] Search selected:", feature.place_name);
    console.log("[LOCATION DEBUG] Selected lat/lng:", nextLocation.lat, nextLocation.lng);
    console.log("[LOCATION DEBUG] location_source: search");
    console.log("[LOCATION DEBUG] Final display_address:", selectedAddress);
    
    applyLocation({
      ...nextLocation,
      display_address: selectedAddress,
      geocoded_address: selectedAddress,
      location_source: "search"
    });
    setAddressQuery(selectedAddress);
    setAddressSuggestions([]);
    toast.success("Event location saved.");
  };

  const handleConfirmMapCenter = async (lat, lng) => {
    setIsSaving(true);
    try {
      const nextLocation = await reverseGeocode(lat, lng);
      const geocoded = nextLocation.address_text;
      
      console.log("[LOCATION DEBUG] Map pin dropped at:", lat, lng);
      console.log("[LOCATION DEBUG] Reverse geocode result:", geocoded);
      
      const newDisplayAddress = formData.display_address?.trim() ? formData.display_address : geocoded;
      
      console.log("[LOCATION DEBUG] location_source: pin");
      console.log("[LOCATION DEBUG] Final display_address:", newDisplayAddress);

      applyLocation({ 
        ...nextLocation, 
        lat, 
        lng,
        address_text: newDisplayAddress,
        addressText: newDisplayAddress,
        display_address: newDisplayAddress,
        geocoded_address: geocoded,
        location_source: "pin"
      });
      setAddressQuery(""); // Clear search since we are using pin
      toast.success("Event location saved.");
    } catch {
      console.log("[LOCATION DEBUG] Map pin dropped at:", lat, lng);
      console.log("[LOCATION DEBUG] Reverse geocode FAILED");
      
      const fallbackAddress = formData.display_address?.trim() ? formData.display_address : "";
      
      console.log("[LOCATION DEBUG] location_source: pin");
      console.log("[LOCATION DEBUG] Final display_address:", fallbackAddress);

      const fallbackLocation = {
        lat,
        lng,
        address_text: fallbackAddress,
        addressText: fallbackAddress,
        city: formData.city || "",
        state: formData.state || "",
        zip: formData.zip || "",
      };
      applyLocation({
        ...fallbackLocation,
        display_address: fallbackAddress,
        geocoded_address: "",
        location_source: "pin"
      });
      setAddressQuery("");
      toast.success("Event location saved.");
    } finally {
      setIsSaving(false);
      setIsMapModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Address search */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Search for Event Address</label>
        <div className="relative">
          <Input
            value={addressQuery}
            onChange={(event) => setAddressQuery(event.target.value)}
            placeholder="Search for an event address"
            className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-11 pr-10 text-slate-800 placeholder:text-slate-300"
          />
          {isSearching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
        </div>

        {addressSuggestions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
            {addressSuggestions.map((feature) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => handleSelectSuggestion(feature)}
                className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
              >
                {feature.place_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map picker button */}
      <Button
        type="button"
        onClick={() => setIsMapModalOpen(true)}
        className="w-full py-6 text-base bg-[#006168] hover:bg-[#004d52] text-white flex gap-3 rounded-xl font-semibold shadow-sm"
      >
        <MapIcon className="w-5 h-5" />
        Drop a pin on the map
      </Button>

      {/* Confirmed location */}
      {typeof formData.lat === "number" && typeof formData.lng === "number" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Display Address (what attendees see)</label>
            <Input
              value={formData.display_address || formData.address_text || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, display_address: e.target.value, addressText: e.target.value, address_text: e.target.value }))}
              placeholder="e.g. 123 Main St (West Entrance)"
              className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-11 text-slate-800 placeholder:text-slate-300"
            />
            <p className="text-xs text-slate-400">This is the public address shown on your listing.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-0.5">
            <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#006168]" />
              {formData.display_address || formData.address_text || formData.addressText || "Location confirmed"}
              {formData.location_source === "pin" && <span className="ml-1 text-[10px] bg-[#006168]/10 text-[#006168] px-2 py-0.5 rounded-full font-medium">Pin</span>}
            </p>
            <p className="text-xs text-slate-400 pl-6">
              {Number(formData.lat).toFixed(4)}, {Number(formData.lng).toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving location...
        </div>
      )}

      <EventMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialLat={formData.lat}
        initialLng={formData.lng}
        onConfirm={handleConfirmMapCenter}
      />
    </div>
  );
}