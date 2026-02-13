import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StepTwo({ formData, setFormData, onGeocodeRef }) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [debugInfo, setDebugInfo] = useState({ lastQueryString: "", lastResponseCount: null, lastErrorMessage: "" });

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

        setFormData((prev) => ({ ...prev, lat, lng }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();

          if (data?.address) {
            const addr = data.address;
            setFormData((prev) => ({
              ...prev,
              addressText: `${addr.house_number || ""} ${addr.road || ""}`.trim(),
              city: addr.city || addr.town || addr.village || "",
              state: addr.state || "",
              zip: addr.postcode || "",
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
    console.log("[StepTwo] geocodeAddress() ENTERED", {
      addressText: formData.addressText,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
    });
    toast("geocodeAddress() started");

    // 1) Validation — never silent
    const missing = [];
    if (!formData.addressText?.trim()) missing.push("Street Address");
    if (!formData.city?.trim()) missing.push("City");
    if (!formData.state?.trim()) missing.push("State");
    if (!formData.zip?.trim()) missing.push("ZIP Code");

    if (missing.length > 0) {
      console.log("[StepTwo] validation failed, missing:", missing);
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
        `${formData.addressText}, ${formData.city}, ${formData.state}, ${formData.zip}`,
        `${formData.addressText}, ${formData.city}, ${formData.state}`,
        `${formData.addressText}, ${formData.city}`,
        `${formData.city}, ${formData.state} ${formData.zip}`
      ];

      let data = [];
      let usedQuery = "";

      for (const query of queries) {
        usedQuery = query;
        console.log("[StepTwo] geocode query:", query);

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
        console.log("[StepTwo] Geocode request URL:", url);

        const response = await fetch(url);
        console.log("[StepTwo] Geocode response status:", response.status);

        if (!response.ok) {
          const errMsg = `HTTP ${response.status}`;
          setDebugInfo((prev) => ({ ...prev, lastQueryString: query, lastErrorMessage: errMsg }));
          toast.error("Address search failed. Please try again.");
          return false;
        }

        data = await response.json();
        console.log("[StepTwo] Geocode results count:", Array.isArray(data) ? data.length : null, "for query:", query);

        if (Array.isArray(data) && data.length > 0) {
          break;
        }
      }

      setDebugInfo({ lastQueryString: usedQuery, lastResponseCount: data?.length ?? 0, lastErrorMessage: "" });

      if (Array.isArray(data) && data.length > 0) {
        if (data.length === 1) {
          setFormData((prev) => ({
            ...prev,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
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
      console.error("[StepTwo] Geocode error:", error);
      setDebugInfo((prev) => ({ ...prev, lastErrorMessage: error.message }));
      toast.error("Address search failed. Please try again.");
      return false;
    } finally {
      setIsGeocoding(false);
      console.log("[StepTwo] Geocode finished; isGeocoding reset to false");
    }
  }, [formData.addressText, formData.city, formData.state, formData.zip]);

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
          Add your address or use your GPS. (This sets the pin location.)
        </p>
      </div>

      <div>
        <Label className="text-[#2C4F4E]" htmlFor="addressText">
          Street Address *
        </Label>
        <Input
          id="addressText"
          placeholder="123 Main St"
          value={formData.addressText}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, addressText: e.target.value }))
          }
          required
          className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF]"
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
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
            required
            className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF]"
          />
        </div>

        <div>
          <Label className="text-[#2C4F4E]" htmlFor="state">
            State *
          </Label>
          <Input
            id="state"
            value={formData.state || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
            required
            maxLength={2}
            placeholder="CA"
            className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF] uppercase"
          />
        </div>

        <div>
          <Label className="text-[#2C4F4E]" htmlFor="zip">
            ZIP Code *
          </Label>
          <Input
            id="zip"
            value={formData.zip}
            onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value }))}
            required
            className="border-[#2C4F4E] focus-visible:ring-[#5DADA5] bg-[#F3E6CF]"
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
          onClick={() => {
            console.log("[StepTwo] Locate Address clicked, isGeocoding:", isGeocoding);
            toast("Locate Address clicked");
            geocodeAddress();
          }}
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

      {formData.lat && formData.lng && (
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
                  const addr = suggestion.address || {};
                  setFormData((prev) => ({
                    ...prev,
                    addressText: `${addr.house_number || ""} ${addr.road || ""}`.trim() || suggestion.display_name.split(',')[0],
                    city: addr.city || addr.town || addr.village || formData.city,
                    state: addr.state || formData.state,
                    zip: addr.postcode || formData.zip,
                    lat: parseFloat(suggestion.lat),
                    lng: parseFloat(suggestion.lon),
                  }));
                  setAddressSuggestions([]);
                  toast.success("Address selected");
                }}
                className="w-full text-left p-3 border-2 border-[#2C4F4E] rounded-lg bg-[#F3E6CF] hover:bg-[#E7D7B8] transition-colors"
              >
                <p className="text-sm text-[#2C4F4E] font-medium">{suggestion.display_name}</p>
              </button>
            ))}
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