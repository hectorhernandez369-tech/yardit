import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, MapPin, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8&countrycodes=us`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
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
      <p className="text-sm font-medium text-gray-800 leading-snug">{parsed.formatted.split(",").slice(0, 3).join(",")}</p>
      {cityStateZip && <p className="text-xs text-gray-500 mt-0.5">{cityStateZip}</p>}
    </button>
  );
}

export default function AdminAddressSearch({ onAddressSelected, selectedAddress }) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setNoResults(false);
    try {
      const data = await searchNominatim(q);
      if (!data || data.length === 0) {
        setNoResults(true);
        setIsSearching(false);
        return;
      }
      if (data.length === 1) {
        // Auto-select single result
        const parsed = parseResult(data[0]);
        onAddressSelected(parsed);
        setQuery(parsed.formatted.split(",").slice(0, 3).join(","));
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
    setQuery(parsed.formatted.split(",").slice(0, 3).join(","));
    setShowModal(false);
    setResults([]);
  };

  const handleReset = () => {
    setQuery("");
    setNoResults(false);
    onAddressSelected(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search address (e.g. 874 Ash St, Lindsay)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNoResults(false); }}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-3"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="shrink-0"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
        {selectedAddress && (
          <Button variant="ghost" size="icon" onClick={handleReset} title="Clear address" className="shrink-0 text-gray-400 hover:text-red-500">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {noResults && (
        <p className="text-sm text-red-600 flex items-center gap-1.5 px-1">
          We couldn't find that address. Try adding city, state, or ZIP.
        </p>
      )}

      {selectedAddress && (
        <div className="flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-800 leading-snug truncate">{selectedAddress.street || selectedAddress.formatted}</p>
            <p className="text-xs text-green-700">
              {[selectedAddress.city, selectedAddress.state, selectedAddress.zip].filter(Boolean).join(", ")}
              {" · "}
              <span className="text-green-600 font-mono">{selectedAddress.lat.toFixed(5)}, {selectedAddress.lng.toFixed(5)}</span>
            </p>
          </div>
        </div>
      )}

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