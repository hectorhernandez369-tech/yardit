import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StepTwo({ formData, setFormData }) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
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
            if (data.address) {
              const addr = data.address;
              setFormData((prev) => ({
                ...prev,
                addressText: `${addr.house_number || ""} ${addr.road || ""}`.trim(),
                city: addr.city || addr.town || addr.village || "",
                zip: addr.postcode || "",
              }));
            }
          } catch (error) {
            console.error("Error getting address:", error);
          }

          setIsGettingLocation(false);
          toast.success("Location detected!");
        },
        () => {
          setIsGettingLocation(false);
          toast.error("Could not get your location");
        }
      );
    }
  };

  const geocodeAddress = async () => {
    if (!formData.addressText || !formData.city || !formData.zip) {
      toast.error("Please fill in address fields first");
      return;
    }

    const fullAddress = `${formData.addressText}, ${formData.city}, ${formData.zip}`;
    setIsGeocoding(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        }));
        toast.success("Address located!");
      } else {
        toast.error("Could not find address");
      }
    } catch (error) {
      toast.error("Error finding address");
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="addressText">Street Address *</Label>
        <Input
          id="addressText"
          placeholder="123 Main St"
          value={formData.addressText}
          onChange={(e) => setFormData(prev => ({ ...prev, addressText: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="zip">ZIP Code *</Label>
          <Input
            id="zip"
            value={formData.zip}
            onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          variant="outline"
          className="gap-2"
        >
          {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Use My Location
        </Button>
        <Button
          type="button"
          onClick={geocodeAddress}
          disabled={isGeocoding}
          variant="outline"
          className="gap-2"
        >
          {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          Locate Address
        </Button>
      </div>

      {formData.lat && formData.lng && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Location set: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDateTime">Start Date & Time *</Label>
          <Input
            id="startDateTime"
            type="datetime-local"
            value={formData.startDateTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
            required
          />
        </div>

      </div>
    </div>
  );
}