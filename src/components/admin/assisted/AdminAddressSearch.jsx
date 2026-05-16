import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, MapPin, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

async function searchNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "8",
    countrycodes: "us",
    viewbox: "-124.5,32.5,-114.1,42.1",
    bounded: "0",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

async function fuzzySearch(street, city, state, zip) {
  const parts = [street, city, state, zip].filter(Boolean);
  const base = parts.join(", ");
  const attempts = [
    base,
    `${base}, California`,
    `${base}, Tulare County, CA`,
    [street, city, state].filter(Boolean).join(", "),
  ];
  for (const attempt of attempts) {
    if (!attempt.trim()) continue;
    const data = await searchNominatim(attempt);
    if (data && data.length > 0) return data;
  }
  return [];
}

function parseResult(result) {
  const a = result.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.county || "";
  const state = a.state || "";
  const zip = a.postcode || "";
  const formatted = result.display_name || "";
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  return { street, city, state, zip, formatted, lat, lng };
}

function ResultItem({ result, onSelect }) {
  const parsed = parseResult(result);
  const cityStateZip = [parsed.city, parsed.state, parsed.zip].filter(Boolean).join(", ");
  return (
    <button
      onClick={() => onSelect(parsed)}
      className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b last:border-0 transition-colors"
    >
      <p className="text-sm font-medium text-gray-800 leading-snug">
        {parsed.formatted.split(",").slice(0, 3).join(",")}
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
    try {
      const data = await fuzzySearch(street.trim(), city.trim(), state.trim(), zip.trim());
      if (!data || data.length === 0) {
        setNoResults(true);
      } else if (data.length === 1) {
        const parsed = parseResult(data[0]);
        onAddressSelected(parsed);
      } else {
        setResults(data);
        setShowModal(true);
      }
    } catch {
      toast.error("Address search failed. Check your connection.");
    }
    setIsSearching(false);
  };

  const handleSelect = (parsed) => {
    onAddressSelected(parsed);
    setShowModal(false);
    setResults([]);
  };

  const handleReset = () => {
    setStreet("");
    setCity("");
    setState("");
    setZip("");
    setNoResults(false);
    onAddressSelected(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-3">
      {/* Street */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Street Address</Label>
        <Input
          placeholder="e.g. 874 Asheville Ave"
          value={street}
          onChange={(e) => { setStreet(e.target.value); setNoResults(false); }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* City + State */}
      <div className="grid grid-cols-3 gap-2 min-w-0">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-gray-500">City</Label>
          <Input
            placeholder="e.g. Lindsay"
            value={city}
            onChange={(e) => { setCity(e.target.value); setNoResults(false); }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">State</Label>
          <Input
            placeholder="CA"
            value={state}
            maxLength={2}
            onChange={(e) => { setState(e.target.value.toUpperCase()); setNoResults(false); }}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* ZIP */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">ZIP Code <span className="text-gray-400">(optional)</span></Label>
        <Input
          placeholder="e.g. 93247"
          value={zip}
          onChange={(e) => { setZip(e.target.value); setNoResults(false); }}
          onKeyDown={handleKeyDown}
          className="max-w-[140px]"
        />
      </div>

      {/* Search button */}
      <div className="flex items-center gap-2">
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

      {/* Selected address confirmation */}
      {selectedAddress && (
        <div className="flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-800 leading-snug truncate">
              {selectedAddress.street || selectedAddress.formatted}
            </p>
            <p className="text-xs text-green-700">
              {[selectedAddress.city, selectedAddress.state, selectedAddress.zip].filter(Boolean).join(", ")}
              {" · "}
              <span className="font-mono">{selectedAddress.lat?.toFixed(5)}, {selectedAddress.lng?.toFixed(5)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Results picker modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              Select Correct Address
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 divide-y border-t">
            {results.map((r) => (
              <ResultItem key={r.place_id} result={r} onSelect={handleSelect} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}