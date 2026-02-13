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

  // Expose geocodeAddress to parent via ref
  useEffect(() => {
    if (onGeocodeRef) {
      onGeocodeRef(geocodeAddress);
    }
  }, [formData.addressText, formData.city, formData.state, formData.zip]);

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

  const geocodeAddress = async () => {
    if (!formData.addressText || !formData.city || !formData.state || !formData.zip) {
      toast.error("Please fill in address, city, state, and ZIP first");
      return false;
    }

    setIsGeocoding(true);
    setAddressSuggestions([]);

    try {
      // Try full address first
      let queries = [
        `${formData.addressText}, ${formData.city}, ${formData.state}, ${formData.zip}`,
        `${formData.addressText}, ${formData.city}, ${formData.state}`,
        `${formData.addressText}, ${formData.city}`,
        `${formData.city}, ${formData.state} ${formData.zip}`
      ];

      let data = [];
      for (const query of queries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          break; // Found results, stop retrying
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        if (data.length === 1) {
          // Single match - auto-select
          setFormData((prev) => ({
            ...prev,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          }));
          toast.success("Address located!");
          return true;
        } else {
          // Multiple matches - show suggestions
          setAddressSuggestions(data.slice(0, 5));
          toast.info(`Found ${data.length} possible matches. Select one below.`);
          return false;
        }
      } else {
        toast.error("Address could not be located. Please check spelling.");
        return false;
      }
    } catch (error) {
      toast.error("Error locating address");
      return false;
    } finally {
      setIsGeocoding(false);
    }
  };

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
          onClick={geocodeAddress}
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

      {/* REMOVED: Start Date & Time section (per request) */}
    </div>
  );
}