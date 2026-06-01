import React, { useState, useEffect, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Loader2, X, Plus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const RADIUS_PRESETS = [1, 3, 5, 10, 25, 50];

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapFlyTo({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 11, { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}

function DraggableMarker({ lat, lng, onDragEnd }) {
  const markerRef = useRef(null);
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat: newLat, lng: newLng } = marker.getLatLng();
        onDragEnd(newLat, newLng);
      }
    },
  };
  return (
    <Marker
      position={[lat, lng]}
      draggable
      ref={markerRef}
      eventHandlers={eventHandlers}
    />
  );
}

export default function GeoPromoSection({ form, onChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [zipInput, setZipInput] = useState("");
  const [customRadius, setCustomRadius] = useState("");
  const [flyTarget, setFlyTarget] = useState(null);

  const geoEnabled = !!form.geographic_limit_enabled;
  const geoType = form.geographic_limit_type || "none";
  const hasCenterPin = form.geo_center_lat && form.geo_center_lng;
  const radiusMiles = form.geo_radius_miles || 5;

  const handleAddCity = () => {
    const val = cityInput.trim();
    if (!val) return;
    const existing = form.eligible_cities || [];
    if (!existing.includes(val)) {
      onChange("eligible_cities", [...existing, val]);
    }
    setCityInput("");
  };

  const handleRemoveCity = (city) => {
    onChange("eligible_cities", (form.eligible_cities || []).filter((c) => c !== city));
  };

  const handleAddZip = () => {
    const val = zipInput.trim();
    if (!val) return;
    const existing = form.eligible_zips || [];
    if (!existing.includes(val)) {
      onChange("eligible_zips", [...existing, val]);
    }
    setZipInput("");
  };

  const handleRemoveZip = (zip) => {
    onChange("eligible_zips", (form.eligible_zips || []).filter((z) => z !== zip));
  };

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data?.[0]) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        onChange("geo_center_lat", newLat);
        onChange("geo_center_lng", newLng);
        onChange("geo_display_label", display_name.split(",").slice(0, 3).join(",").trim());
        setFlyTarget({ lat: newLat, lng: newLng });
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = (lat, lng) => {
    onChange("geo_center_lat", lat);
    onChange("geo_center_lng", lng);
    if (!form.geo_display_label) {
      onChange("geo_display_label", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleDragEnd = (lat, lng) => {
    onChange("geo_center_lat", lat);
    onChange("geo_center_lng", lng);
  };

  const setRadius = (miles) => {
    onChange("geo_radius_miles", miles);
    setCustomRadius("");
  };

  return (
    <div className="space-y-3">
      {/* Master toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#5DADA5]" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Geographic Restriction</p>
            <p className="text-[11px] text-slate-500">Limit this code to a specific area</p>
          </div>
        </div>
        <Switch
          checked={geoEnabled}
          onCheckedChange={(v) => {
            onChange("geographic_limit_enabled", v);
            if (!v) onChange("geographic_limit_type", "none");
          }}
        />
      </div>

      {geoEnabled && (
        <div className="space-y-3 pl-1">
          {/* Coverage type selector */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: "none", label: "No limit" },
              { value: "city_zip", label: "City / ZIP" },
              { value: "radius", label: "Map Radius" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange("geographic_limit_type", opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  geoType === opt.value
                    ? "bg-[#2C4F4E] text-white border-[#2C4F4E]"
                    : "bg-white text-slate-600 border-slate-300 hover:border-[#2C4F4E]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* City / ZIP targeting */}
          {geoType === "city_zip" && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
              {/* Cities */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-medium">Eligible Cities</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Lindsay"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCity()}
                    className="text-sm h-8"
                  />
                  <button
                    type="button"
                    onClick={handleAddCity}
                    className="px-2 py-1 rounded bg-[#5DADA5] text-white text-xs hover:bg-[#4A9B93] shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(form.eligible_cities || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(form.eligible_cities || []).map((city) => (
                      <Badge key={city} className="bg-blue-100 text-blue-800 border-blue-200 text-xs gap-1 pr-1">
                        {city}
                        <button type="button" onClick={() => handleRemoveCity(city)} className="hover:text-red-600 ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* ZIPs */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-medium">Eligible ZIP Codes</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 93247"
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddZip()}
                    className="text-sm h-8"
                  />
                  <button
                    type="button"
                    onClick={handleAddZip}
                    className="px-2 py-1 rounded bg-[#5DADA5] text-white text-xs hover:bg-[#4A9B93] shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(form.eligible_zips || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(form.eligible_zips || []).map((zip) => (
                      <Badge key={zip} className="bg-green-100 text-green-800 border-green-200 text-xs gap-1 pr-1">
                        {zip}
                        <button type="button" onClick={() => handleRemoveZip(zip)} className="hover:text-red-600 ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Display label */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-medium">Display Label (shown on card)</Label>
                <Input
                  placeholder="e.g. Lindsay, CA"
                  value={form.geo_display_label || ""}
                  onChange={(e) => onChange("geo_display_label", e.target.value)}
                  className="text-sm h-8"
                />
              </div>
            </div>
          )}

          {/* Radius targeting */}
          {geoType === "radius" && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
              {/* Address search */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-medium">Search Address / City</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Lindsay, CA"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
                    className="text-sm h-8"
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={searching}
                    className="px-2.5 py-1 rounded bg-[#5DADA5] text-white text-xs hover:bg-[#4A9B93] shrink-0 flex items-center gap-1"
                  >
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">Or click/tap the map to set the center point.</p>
              </div>

              {/* Map */}
              <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height: 220 }}>
                <MapContainer
                  center={[hasCenterPin ? form.geo_center_lat : 36.2, hasCenterPin ? form.geo_center_lng : -119.0]}
                  zoom={hasCenterPin ? 10 : 6}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {flyTarget && <MapFlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}
                  {hasCenterPin && (
                    <>
                      <DraggableMarker
                        lat={form.geo_center_lat}
                        lng={form.geo_center_lng}
                        onDragEnd={handleDragEnd}
                      />
                      <Circle
                        center={[form.geo_center_lat, form.geo_center_lng]}
                        radius={radiusMiles * 1609.34}
                        pathOptions={{ color: "#5DADA5", fillColor: "#5DADA5", fillOpacity: 0.1, weight: 2 }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>

              {/* Radius selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-medium">Radius</Label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {RADIUS_PRESETS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadius(r)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                        radiusMiles === r && !customRadius
                          ? "bg-[#2C4F4E] text-white border-[#2C4F4E]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-[#2C4F4E]"
                      }`}
                    >
                      {r} mi
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      placeholder="Custom"
                      value={customRadius}
                      onChange={(e) => {
                        setCustomRadius(e.target.value);
                        if (e.target.value) onChange("geo_radius_miles", parseFloat(e.target.value));
                      }}
                      className="w-20 h-7 text-xs text-center"
                    />
                    <span className="text-xs text-slate-500">mi</span>
                  </div>
                </div>
              </div>

              {/* Display label */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-medium">Display Label (shown on card)</Label>
                <Input
                  placeholder="e.g. Lindsay, CA"
                  value={form.geo_display_label || ""}
                  onChange={(e) => onChange("geo_display_label", e.target.value)}
                  className="text-sm h-8"
                />
              </div>

              {/* Summary */}
              {hasCenterPin && (
                <div className="rounded-lg bg-[#f0faf9] border border-[#5DADA5]/30 px-3 py-2 text-xs text-[#2C4F4E]">
                  <MapPin className="inline w-3 h-3 mr-1" />
                  <strong>{radiusMiles}-mile radius</strong>
                  {form.geo_display_label ? ` from ${form.geo_display_label}` : ` from selected point`}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}