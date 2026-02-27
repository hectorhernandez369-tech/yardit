import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

function MapEventsHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
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
  }, [trigger, center, zoom, map]);
  return null;
}

function MapPickerModal({ isOpen, onClose, onConfirm, initialLat, initialLng }) {
  const [selectedCenter, setSelectedCenter] = useState(initialLat && initialLng ? [initialLat, initialLng] : null);
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]);
  const [mapZoom, setMapZoom] = useState(4);
  const [isLocating, setIsLocating] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialLat && initialLng) {
        setSelectedCenter([initialLat, initialLng]);
        setMapCenter([initialLat, initialLng]);
        setMapZoom(15);
        setRecenterTrigger(prev => prev + 1);
      } else {
        if (navigator.geolocation) {
          setIsLocating(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = [pos.coords.latitude, pos.coords.longitude];
              setMapCenter(coords);
              setMapZoom(15);
              setRecenterTrigger(prev => prev + 1);
              setIsLocating(false);
            },
            () => setIsLocating(false)
          );
        }
      }
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
            url="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA"
            tileSize={512}
            zoomOffset={-1}
          />
          <MapEventsHandler onClick={setSelectedCenter} />
          <RecenterHandler center={mapCenter} zoom={mapZoom} trigger={recenterTrigger} />
          {selectedCenter && (
            <>
              <Marker position={selectedCenter} />
              <Circle center={selectedCenter} radius={152.4} pathOptions={{ color: '#5DADA5', fillColor: '#5DADA5', fillOpacity: 0.2 }} />
            </>
          )}
        </MapContainer>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3 w-[90%] max-w-sm">
          <Button 
            variant="outline"
            className="flex-1 bg-white text-[#2C4F4E] border-[#2C4F4E] shadow-lg hover:bg-gray-50"
            onClick={() => {
               if (navigator.geolocation) {
                 setIsLocating(true);
                 navigator.geolocation.getCurrentPosition(
                   (pos) => {
                     const coords = [pos.coords.latitude, pos.coords.longitude];
                     setMapCenter(coords);
                     setMapZoom(16);
                     setRecenterTrigger(prev => prev + 1);
                     setSelectedCenter(coords);
                     setIsLocating(false);
                   },
                   () => setIsLocating(false)
                 );
               }
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-sm text-[#2C4F4E] font-medium border border-[#2C4F4E]/20">
          Tap the map to place center
        </div>
      </div>
    </div>
  );
}

export default function StepTwo({ formData, setFormData, onGeocodeRef }) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [debugInfo, setDebugInfo] = useState({ lastQueryString: "", lastResponseCount: null, lastErrorMessage: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [locMethod, setLocMethod] = useState("map");
  const isNeighborhood = formData.listingType === "neighborhood_sale";

  // Use a ref to read current formData inside geocodeAddress without re-creating the callback
  const formDataRef = React.useRef(formData);
  formDataRef.current = formData;

  const getCurrentLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      setIsGettingLocation(false);
      toast.error("Geolocation is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setFormData((prev) => ({ 
           ...prev, 
           lat, 
           lng,
           ...(prev.listingType === "neighborhood_sale" ? { event_center_lat: lat, event_center_lng: lng } : {})
        }));

        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA`
          );
          const data = await response.json();
          const feature = data.features?.[0];

          if (feature) {
            let city = "", state = "", zip = "";
            feature.context?.forEach(c => {
              if (c.id.startsWith('place')) city = c.text;
              if (c.id.startsWith('region')) state = c.text;
              if (c.id.startsWith('postcode')) zip = c.text;
            });
            setFormData((prev) => ({
              ...prev,
              addressText: feature.address ? `${feature.address} ${feature.text}` : feature.text,
              city: city || prev.city,
              state: state || prev.state,
              zip: zip || prev.zip,
            }));
          }
        } catch (error) {
          console.error("Error getting address:", error);
        } finally {
          setIsGettingLocation(false);
        }

        toast.success("Location detected!");
      },
      () => {
        setIsGettingLocation(false);
        toast.error("Could not get your location");
      }
    );
  };

  const geocodeAddress = React.useCallback(async () => {
    const fd = formDataRef.current;
    // 1) Validation
    const missing = [];
    if (!fd.addressText?.trim()) missing.push("Street Address");
    if (!fd.city?.trim()) missing.push("City");
    if (!fd.state?.trim()) missing.push("State");
    if (!fd.zip?.trim()) missing.push("ZIP Code");

    if (missing.length > 0) {
      const errors = {};
      if (!fd.addressText?.trim()) errors.addressText = true;
      if (!fd.city?.trim()) errors.city = true;
      if (!fd.state?.trim()) errors.state = true;
      if (!fd.zip?.trim()) errors.zip = true;
      setFieldErrors(errors);
      toast.error(`Missing: ${missing.join(", ")}`);
      return false;
    }

    // 2) Immediate feedback
    toast.info("Locating address...");
    setIsGeocoding(true);
    setAddressSuggestions([]);
    setDebugInfo({ lastQueryString: "", lastResponseCount: null, lastErrorMessage: "" });

    try {
      const queries = [
        `${fd.addressText}, ${fd.city}, ${fd.state}, ${fd.zip}`,
        `${fd.addressText}, ${fd.city}, ${fd.state}`,
        `${fd.addressText}, ${fd.city}`,
        `${fd.city}, ${fd.state} ${fd.zip}`
      ];

      let data = [];
      let usedQuery = "";
      const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

      for (const query of queries) {
        usedQuery = query;

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`;

        const response = await fetch(url);

        if (!response.ok) {
          const errMsg = `HTTP ${response.status}`;
          setDebugInfo((prev) => ({ ...prev, lastQueryString: query, lastErrorMessage: errMsg }));
          toast.error("Address search failed. Please try again.");
          return false;
        }

        const json = await response.json();
        data = json.features || [];

        if (data.length > 0) {
          break;
        }
      }

      setDebugInfo({ lastQueryString: usedQuery, lastResponseCount: data?.length ?? 0, lastErrorMessage: "" });

      if (data.length > 0) {
        if (data.length === 1) {
          setFormData((prev) => ({
            ...prev,
            lat: data[0].center[1],
            lng: data[0].center[0],
            ...(prev.listingType === "neighborhood_sale" ? { event_center_lat: data[0].center[1], event_center_lng: data[0].center[0] } : {})
          }));
          toast.success("Address located!");
          return true;
        } else {
          setAddressSuggestions(data.slice(0, 5));
          toast.info(`Found ${data.length} possible matches. Select one below.`);
          return false;
        }
      } else {
        setDebugInfo((prev) => ({ ...prev, lastErrorMessage: "Zero results" }));
        toast.error("No match found. Try a suggestion or adjust spelling.");
        return false;
      }
    } catch (error) {
      setDebugInfo((prev) => ({ ...prev, lastErrorMessage: error.message }));
      toast.error("Address search failed. Please try again.");
      return false;
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Expose geocodeAddress to parent
  React.useEffect(() => {
    if (onGeocodeRef) {
      onGeocodeRef(geocodeAddress);
    }
  }, [geocodeAddress, onGeocodeRef]);

  return (
    <div className="space-y-6">
      {/* Header (teal + parchment vibe) */}
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Location</h3>
        <p className="text-sm text-[#1F2937] opacity-80">
          {isNeighborhood 
            ? "Pick the central location for your Neighborhood Sale on the map."
            : "Add your address or use your GPS. (This sets the pin location.)"}
        </p>
      </div>

      {/* Location Options Toggle for Neighborhood Sale */}
      {isNeighborhood && (
        <div className="flex flex-col gap-2">
          <Label className="text-[#2C4F4E]">Location Method</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={locMethod === "map" ? "default" : "outline"} onClick={() => setLocMethod("map")} className={locMethod === "map" ? "bg-[#5DADA5] hover:bg-[#4A9B93] text-white" : "border-[#2C4F4E] text-[#2C4F4E] bg-[#F3E6CF] hover:bg-[#E7D7B8]"}>
              <MapIcon className="w-4 h-4 mr-2" /> Select Center on Map
            </Button>
            <Button type="button" variant={locMethod === "gps" ? "default" : "outline"} onClick={() => { setLocMethod("gps"); getCurrentLocation(); }} className={locMethod === "gps" ? "bg-[#5DADA5] hover:bg-[#4A9B93] text-white" : "border-[#2C4F4E] text-[#2C4F4E] bg-[#F3E6CF] hover:bg-[#E7D7B8]"}>
              <Navigation className="w-4 h-4 mr-2" /> Use My Address
            </Button>
            <Button type="button" variant={locMethod === "manual" ? "default" : "outline"} onClick={() => setLocMethod("manual")} className={locMethod === "manual" ? "bg-[#5DADA5] hover:bg-[#4A9B93] text-white" : "border-[#2C4F4E] text-[#2C4F4E] bg-[#F3E6CF] hover:bg-[#E7D7B8]"}>
              Enter Address Manually
            </Button>
          </div>
        </div>
      )}

      {isNeighborhood && locMethod === "map" && (
        <div className="space-y-4">
          <Button 
            type="button" 
            onClick={() => setIsMapModalOpen(true)}
            className="w-full py-8 text-lg bg-[#5DADA5] hover:bg-[#4A9B93] text-white flex gap-3 shadow-md border-2 border-[#2C4F4E]"
          >
            <MapIcon className="w-6 h-6" />
            Pick center on map
          </Button>
          
          {formData.event_center_lat && formData.event_center_lng && (
            <div className="rounded-lg border border-[#2C4F4E]/40 bg-[#F3E6CF] px-4 py-3">
              <p className="text-sm font-medium text-[#2C4F4E] flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Center selected on map.
              </p>
              <p className="text-xs text-[#1F2937] opacity-80 mt-1">
                {Number(formData.event_center_lat).toFixed(4)}, {Number(formData.event_center_lng).toFixed(4)}
              </p>
            </div>
          )}

          <MapPickerModal 
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            initialLat={formData.event_center_lat || formData.lat}
            initialLng={formData.event_center_lng || formData.lng}
            onConfirm={async (lat, lng) => {
              setIsMapModalOpen(false);
              toast.info("Saving location...");
              try {
                const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
                const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`);
                const data = await response.json();
                const feature = data.features?.[0];
                let city = "Unknown", state = "XX", zip = "00000";
                if (feature) {
                   feature.context?.forEach(c => {
                     if (c.id.startsWith('place')) city = c.text;
                     if (c.id.startsWith('region')) state = c.text;
                     if (c.id.startsWith('postcode')) zip = c.text;
                   });
                }
                setFormData(prev => ({
                  ...prev,
                  event_center_lat: lat,
                  event_center_lng: lng,
                  lat: lat,
                  lng: lng,
                  addressText: feature ? (feature.address ? `${feature.address} ${feature.text}` : feature.text) : "Map Location",
                  city,
                  state,
                  zip
                }));
                toast.success("Center location saved!");
              } catch (e) {
                setFormData(prev => ({
                  ...prev,
                  event_center_lat: lat,
                  event_center_lng: lng,
                  lat: lat,
                  lng: lng,
                  addressText: "Map Location",
                  city: "Unknown",
                  state: "XX",
                  zip: "00000"
                }));
                toast.success("Center location saved!");
              }
            }}
          />
        </div>
      )}

      {(!isNeighborhood || locMethod === "manual" || locMethod === "gps") && (
        <div className="space-y-6">
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="addressText">
          Street Address *
        </Label>
        <Input
          id="addressText"
          placeholder="123 Main St"
          value={formData.addressText}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, addressText: e.target.value }));
            if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, addressText: false }));
          }}
          required
          className={`focus-visible:ring-[#5DADA5] bg-[#F3E6CF] ${fieldErrors.addressText ? "border-red-500 border-2" : "border-[#2C4F4E]"}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-[#2C4F4E]" htmlFor="city">
            City *
          </Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, city: e.target.value }));
              if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, city: false }));
            }}
            required
            className={`focus-visible:ring-[#5DADA5] bg-[#F3E6CF] ${fieldErrors.city ? "border-red-500 border-2" : "border-[#2C4F4E]"}`}
          />
        </div>

        <div>
          <Label className="text-[#2C4F4E]" htmlFor="state">
            State *
          </Label>
          <Input
            id="state"
            value={formData.state || ""}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }));
              if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, state: false }));
            }}
            required
            maxLength={2}
            placeholder="CA"
            className={`focus-visible:ring-[#5DADA5] bg-[#F3E6CF] uppercase ${fieldErrors.state ? "border-red-500 border-2" : "border-[#2C4F4E]"}`}
          />
        </div>

        <div>
          <Label className="text-[#2C4F4E]" htmlFor="zip">
            ZIP Code *
          </Label>
          <Input
            id="zip"
            value={formData.zip}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, zip: e.target.value }));
              if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, zip: false }));
            }}
            required
            className={`focus-visible:ring-[#5DADA5] bg-[#F3E6CF] ${fieldErrors.zip ? "border-red-500 border-2" : "border-[#2C4F4E]"}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          variant="outline"
          className="gap-2 border-2 border-[#2C4F4E] bg-[#F3E6CF] text-[#2C4F4E] hover:bg-[#E7D7B8]"
        >
          {isGettingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          Use My Location (GPS)
        </Button>

        <Button
          type="button"
          onClick={() => geocodeAddress()}
          disabled={isGeocoding}
          variant="outline"
          className="gap-2 border-2 border-[#F4A849] bg-[#F3E6CF] text-[#2C4F4E] hover:bg-[#E7D7B8]"
        >
          {isGeocoding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          Locate Address (Search)
        </Button>
      </div>
      </div>
      )}

      {!isNeighborhood && formData.lat && formData.lng && (
        <div className="rounded-lg border border-[#2C4F4E]/40 bg-[#F3E6CF] px-3 py-2">
          <p className="text-xs text-[#2C4F4E] flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Location set: {Number(formData.lat).toFixed(4)}, {Number(formData.lng).toFixed(4)}
          </p>
          <p className="text-[11px] text-[#1F2937] opacity-70">
            (This is the pin location that will show on the map.)
          </p>
        </div>
      )}

      {/* Address Suggestions */}
      {addressSuggestions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[#2C4F4E]">Suggested Matches (tap to select):</Label>
          <div className="space-y-2">
            {addressSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  let city = formData.city, state = formData.state, zip = formData.zip;
                  suggestion.context?.forEach(c => {
                    if (c.id.startsWith('place')) city = c.text;
                    if (c.id.startsWith('region')) state = c.text;
                    if (c.id.startsWith('postcode')) zip = c.text;
                  });
                  setFormData((prev) => ({
                    ...prev,
                    addressText: suggestion.address ? `${suggestion.address} ${suggestion.text}` : suggestion.text,
                    city,
                    state,
                    zip,
                    lat: suggestion.center[1],
                    lng: suggestion.center[0],
                    ...(prev.listingType === "neighborhood_sale" ? { event_center_lat: suggestion.center[1], event_center_lng: suggestion.center[0] } : {})
                  }));
                  setAddressSuggestions([]);
                  toast.success("Address selected");
                }}
                className="w-full text-left p-3 border-2 border-[#2C4F4E] rounded-lg bg-[#F3E6CF] hover:bg-[#E7D7B8] transition-colors"
              >
                <p className="text-sm text-[#2C4F4E] font-medium">{suggestion.place_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {isNeighborhood && (
        <div className="pt-6 mt-6 border-t-2 border-[#2C4F4E]/20">
          <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4 mb-4">
            <h3 className="text-[#2C4F4E] font-semibold">Event Dates</h3>
            <p className="text-sm text-[#1F2937] opacity-80">
              Select the start and end dates for your Neighborhood Sale (up to 3 days).
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#2C4F4E]">Start Date *</Label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.selectedRangeStartDate || ""}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setFormData(prev => ({ ...prev, selectedRangeStartDate: newStart }));
                  
                  if (formData.selectedRangeEndDate) {
                     const start = new Date(newStart);
                     const end = new Date(formData.selectedRangeEndDate);
                     const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                     if (diffDays > 3 || end < start) {
                        toast.error("Event can be a maximum of 3 days and end date must be after start date.");
                        setFormData(prev => ({ ...prev, selectedRangeEndDate: "" }));
                     }
                  }
                }}
                className={`bg-[#F3E6CF] border-[#2C4F4E]`}
                required
              />
            </div>
            <div>
              <Label className="text-[#2C4F4E]">End Date *</Label>
              <Input
                type="date"
                min={formData.selectedRangeStartDate || new Date().toISOString().split('T')[0]}
                value={formData.selectedRangeEndDate || ""}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  if (!formData.selectedRangeStartDate) {
                    toast.error("Please select a start date first.");
                    return;
                  }
                  const start = new Date(formData.selectedRangeStartDate);
                  const end = new Date(newEnd);
                  const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                  
                  if (diffDays > 3) {
                    toast.error("Event can be a maximum of 3 days.");
                    return;
                  }
                  if (end < start) {
                    toast.error("End date cannot be before start date.");
                    return;
                  }
                  
                  setFormData(prev => ({ ...prev, selectedRangeEndDate: newEnd }));
                }}
                className={`bg-[#F3E6CF] border-[#2C4F4E]`}
                required
              />
            </div>
          </div>
        </div>
      )}



      {/* Debug overlay (temporary) */}
      {(debugInfo.lastQueryString || debugInfo.lastErrorMessage) && (
        <div className="mt-4 rounded border border-dashed border-gray-400 bg-gray-100 p-2 text-[11px] font-mono text-gray-600">
          <p><strong>DEBUG</strong></p>
          <p>Query: {debugInfo.lastQueryString || "—"}</p>
          <p>Results: {debugInfo.lastResponseCount ?? "—"}</p>
          <p>Error: {debugInfo.lastErrorMessage || "none"}</p>
        </div>
      )}
    </div>
  );
}