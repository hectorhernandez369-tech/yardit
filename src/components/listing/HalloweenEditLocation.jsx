import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getStateAbbreviation } from "@/lib/listingLocation";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
export default function HalloweenEditLocation({ draft, setDraft }) {
  const [query, setQuery] = useState(draft.address || [draft.street_address, draft.city, draft.state, draft.zip_code].filter(Boolean).join(", "));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!query.trim()) return setError("Enter an address to search.");
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=address`);
      if (!response.ok) throw new Error("Address search failed. Try again.");
      const data = await response.json();
      setResults(data.features || []);
      if (!data.features?.length) setError("No address found. Try a more specific search.");
    } catch (err) { setError(err.message || "Address search failed."); }
    finally { setLoading(false); }
  };

  const choose = (result) => {
    const context = result.context || [];
    const city = context.find(c => c.id.startsWith("place."))?.text || context.find(c => c.id.startsWith("locality."))?.text || "";
    const state = getStateAbbreviation(context.find(c => c.id.startsWith("region."))?.short_code?.split("-").pop() || context.find(c => c.id.startsWith("region."))?.text);
    const zip = context.find(c => c.id.startsWith("postcode."))?.text || "";
    if (!result.address || !city || !state || !zip || !Number.isFinite(result.center?.[0]) || !Number.isFinite(result.center?.[1])) {
      setError("Choose a result with a street number, city, state, and ZIP code.");
      return;
    }
    const street = `${result.address} ${result.text}`;
    setDraft(prev => ({ ...prev, street_address: street, city, state, zip_code: zip, address: [street, city, state, zip].join(", "), latitude: result.center[1], longitude: result.center[0], locationPending: false, locationChanged: true }));
    setQuery(result.place_name);
    setResults([]);
    setError("");
  };

  return <div className="space-y-2 rounded-xl border border-slate-200 p-3">
    <Label htmlFor="halloween-edit-address">Spot address</Label>
    <p className="text-xs text-slate-600">Current: {draft.address || [draft.street_address, draft.city, draft.state, draft.zip_code].filter(Boolean).join(", ")}</p>
    <div className="flex gap-2"><Input id="halloween-edit-address" className="min-w-0 flex-1" value={query} onChange={e => { setQuery(e.target.value); setResults([]); setDraft(prev => ({ ...prev, locationPending: true })); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="Street address, city, state, ZIP" /><Button type="button" variant="outline" disabled={loading} onClick={search}>{loading ? "Searching…" : "Find"}</Button></div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {results.map(result => <button type="button" key={result.id} onClick={() => choose(result)} className="block w-full rounded-lg border border-slate-200 p-2 text-left text-sm hover:bg-slate-50">{result.place_name}</button>)}
    {draft.locationPending && <p className="text-xs text-amber-700">Select a matching address before saving.</p>}
  </div>;
}