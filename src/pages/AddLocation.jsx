import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, Loader2, Navigation, ShoppingBag, Candy } from "lucide-react";
import { toast } from "sonner";

export default function AddLocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    type: "yard_sale",
    title: "",
    address: "",
    latitude: null,
    longitude: null,
    description: "",
    date: "",
    contact_info: "",
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const createLocationMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location added successfully!");
      navigate(createPageUrl("Map"));
    },
    onError: (error) => {
      toast.error("Failed to add location. Please try again.");
      console.error(error);
    },
  });

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setFormData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));

          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            if (data.display_name) {
              setFormData((prev) => ({
                ...prev,
                address: data.display_name,
              }));
            }
          } catch (error) {
            console.error("Error getting address:", error);
          }

          setIsGettingLocation(false);
          toast.success("Location detected!");
        },
        (error) => {
          setIsGettingLocation(false);
          toast.error("Could not get your location. Please enter address manually.");
          console.error(error);
        }
      );
    } else {
      setIsGettingLocation(false);
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const geocodeAddress = async () => {
    if (!formData.address) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          formData.address
        )}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        }));
        toast.success("Address located on map!");
      } else {
        toast.error("Could not find address. Please try a different one.");
      }
    } catch (error) {
      toast.error("Error finding address.");
      console.error(error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.address || !formData.latitude || !formData.longitude) {
      toast.error("Please fill in all required fields and set location.");
      return;
    }

    createLocationMutation.mutate(formData);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <MapPin className="w-6 h-6" />
              Add a New Location
            </CardTitle>
            <p className="text-white/90 text-sm mt-1">
              Share a yard sale or Halloween candy spot with your community!
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Location Type</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <label
                    htmlFor="yard_sale"
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === "yard_sale"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="yard_sale" id="yard_sale" />
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium">Yard Sale</p>
                        <p className="text-xs text-gray-500">Selling items</p>
                      </div>
                    </div>
                  </label>

                  <label
                    htmlFor="halloween_candy"
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === "halloween_candy"
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="halloween_candy" id="halloween_candy" />
                    <div className="flex items-center gap-2">
                      <Candy className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Halloween Candy</p>
                        <p className="text-xs text-gray-500">Trick-or-treat</p>
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Multi-family Yard Sale or Full-size Candy Bars!"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Address with Location Button */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    onBlur={geocodeAddress}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    variant="outline"
                    className="gap-2"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Use My Location</span>
                  </Button>
                </div>
                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location set: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">
                  {formData.type === "yard_sale" ? "Sale Date" : "Date (Optional)"}
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder={
                    formData.type === "yard_sale"
                      ? "Describe what you're selling..."
                      : "Tell trick-or-treaters what to expect..."
                  }
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <Label htmlFor="contact_info">Contact Info (Optional)</Label>
                <Input
                  id="contact_info"
                  placeholder="Phone or email (optional)"
                  value={formData.contact_info}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contact_info: e.target.value }))
                  }
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Map"))}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLocationMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                >
                  {createLocationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Add to Map
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Yard Sale Tips
              </h3>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Be specific about what you're selling</li>
                <li>• Include date and time</li>
                <li>• Add photos in description if possible</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Candy className="w-4 h-4" />
                Halloween Tips
              </h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Mention candy types (full-size, variety)</li>
                <li>• Note hours you'll be participating</li>
                <li>• Special decorations or themes</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}