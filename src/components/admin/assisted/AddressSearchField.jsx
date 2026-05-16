import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, CheckCircle, Search } from "lucide-react";

// Nominatim open geocoding — no API key needed, supports fuzzy/partial search
async function searchAddresses(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=us`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  return res.json();
}

function formatResult(r) {
  const a = r.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.hamlet || a.county || "";
  const state = a.state || "";
  const zip = a.postcode || "";
  return { street, city, state, zip, formatted: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
}

export default function AddressSearchField({ value, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [selected, setSelected] = useState(!!value);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setNoResults(false);
    setSelected(false);
    try {
      const results = await searchAddresses(q);
      if (results.length === 0) {
        setNoResults(true);
      } else if (results.length === 1) {
        pick(formatResult(results[0]));
      } else {
        setCandidates(results.map(formatResult));
        setShowModal(true);
      }
    } catch {
      setNoResults(true);
    }
    setIsSearching(false);
  };

  const pick = (addr) => {
    setQuery(addr.formatted);
    setShowModal(false);
    setSelected(true);
    setNoResults(false);
    onSelect(addr);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Search address (e.g. 874 Ash St, Lindsay)"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(false); }}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button variant="outline" size="icon" onClick={handleSearch} disabled={isSearching} className="shrink-0">
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {selected && (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" /> Address selected — location pinned.
        </p>
      )}
      {noResults && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> We couldn't find that address. Try adding city, state, or ZIP.
        </p>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Correct Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {candidates.map((c, i) => (
              <button
                key={i}
                onClick={() => pick(c)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition"
              >
                <p className="text-sm font-medium text-gray-800 leading-snug">{c.street || c.formatted}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[c.city, c.state, c.zip].filter(Boolean).join(", ")}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}