import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, MapPin, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// Same Mapbox token used by StepTwo and the rest of Yardit's geocoding
const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

async function mapboxGeocode(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=us&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocode request failed");
  const data = await res.json();
  return data.features || [];
}

async function geocodeWithFallbacks(street, city, state, zip) {
  const queries = [
    [street, city, state, zip].filter(Boolean).join(", "),
    [street, city, state].filter(Boolean).join(", "),
    [street, city].filter(Boolean).join(", "),
    [city, state, zip].filter(Boolean).join(", "),
  ];

  for (const q of queries) {
    if (!q.trim()) continue;
    const features = await mapboxGeocode(q);
    if (features.length > 0) return features;
  }
  return [];
}

function parseFeature(feature) {
  let street = "", city = "", state = "", zip = "";

  // The feature text/address is the street number + name
  if (feature.address) {
    street = `${feature.address} ${feature.text}`;
  } else {
    street = feature.text || "";
  }

  feature.context?.forEach((c) => {
    if (c.id.startsWith("place")) city = c.text;
    if (c.id.startsWith("region")) state = c.short_code?.replace("US-", "") || c.text;
    if (c.id.startsWith("postcode")) zip = c.text;
    if (c.id.startsWith("neighborhood") && !city) city = c.text;
  });

  const lat = feature.center[1];
  const lng = feature.center[0];
  const formatted = feature.place_name || "";

  return { street, city, state, zip, formatted, lat, lng };
}

function ResultItem({ feature, onSelect }) {
  const parsed = parseFeature(feature);
  const cityStateZip = [parsed.city, parsed.state, parsed.zip].filter(Boolean).join(", ");
  return (
    <button
      onClick={() => onSelect(parsed)}
      className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b last:border-0 transition-colors"
    >
      <p className="text-sm font-medium text-gray-800 leading-snug">
        {parsed.street || feature.place_name?.split(",")[0]}
      </p>
      {cityStateZip && <p className="text-xs text-gray-500 mt-0.5">{cityStateZip}</p>}
    </button>
  );
}

export default function AdminAddressSearch({ onAddressSelected, selectedAddress }) {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const canSearch = !!(street.trim() || city.trim());

  const handleSearch = async () => {
    if (!canSearch) return;
    setIsSearching(true);
    setNoResults(false);
    setResults([]);
    try {
      const features = await geocodeWithFallbacks(
        street.trim(),
        city.trim(),
        state.trim(),
        zip.trim()
      );

      if (!features || features.length === 0) {
        setNoResults(true);
      } else if (features.length === 1) {
        handleSelect(parseFeature(features[0]));
      } else {
        setResults(features);
        setShowModal(true);
      }
    } catch {
      toast.error("Address search failed. Check your connection.");
    }
    setIsSearching(false);
  };

  const handleSelect = (parsed) => {
    onAddressSelected(parsed);
    // Populate fields from geocoded result
    setStreet(parsed.street || "");
    setCity(parsed.city || "");
    setState(parsed.state || "");
    setZip(parsed.zip || "");
    setShowModal(false);
    setResults([]);
    setNoResults(false);
  };

  const handleReset = () => {
    setStreet("");
    setCity("");
    setState("");
    setZip("");
    setNoResults(false);
    setResults([]);
    onAddressSelected(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const markDirty = () => {
    if (selectedAddress) onAddressSelected(null);
    setNoResults(false);
  };

  return (
    <div className="space-y-3">
      {/* Street */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Street Address</Label>
        <Input
          placeholder="e.g. 874 Asheville Ave"
          value={street}
          onChange={(e) => { setStreet(e.target.value); markDirty(); }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* City / State / ZIP */}
      <div className="grid grid-cols-5 gap-2 min-w-0">
        <div className="col-span-2 space-y-1 min-w-0">
          <Label className="text-xs text-gray-500">City</Label>
          <Input
            placeholder="Lindsay"
            value={city}
            onChange={(e) => { setCity(e.target.value); markDirty(); }}
            onKeyDown={handleKeyDown}
            className="min-w-0"
          />
        </div>
        <div className="col-span-1 space-y-1 min-w-0">
          <Label className="text-xs text-gray-500">State</Label>
          <Input
            placeholder="CA"
            value={state}
            onChange={(e) => { setState(e.target.value.toUpperCase()); markDirty(); }}
            onKeyDown={handleKeyDown}
            maxLength={2}
            className="min-w-0"
          />
        </div>
        <div className="col-span-2 space-y-1 min-w-0">
          <Label className="text-xs text-gray-500">ZIP (optional)</Label>
          <Input
            placeholder="93247"
            value={zip}
            onChange={(e) => { setZip(e.target.value); markDirty(); }}
            onKeyDown={handleKeyDown}
            maxLength={5}
            className="min-w-0"
          />
        </div>
      </div>

      {/* Search button */}
      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          onClick={handleSearch}
          disabled={isSearching || !canSearch}
          className="gap-2"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isSearching ? "Searching..." : "Find Address"}
        </Button>
        {selectedAddress && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-gray-400 hover:text-red-500 gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* No results */}
      {noResults && (
        <p className="text-sm text-red-600 px-1">
          No matching address found. Check spelling or add ZIP.
        </p>
      )}

      {/* Selected address confirmation (no lat/lng shown) */}
      {selectedAddress && (
        <div className="flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-800 leading-snug">
              {selectedAddress.street || selectedAddress.formatted?.split(",")[0]}
            </p>
            <p className="text-xs text-green-700">
              {[selectedAddress.city, selectedAddress.state, selectedAddress.zip].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Results modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              Select Correct Address
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 divide-y border-t">
            {results.map((r, i) => (
              <ResultItem key={r.id || i} feature={r} onSelect={handleSelect} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}