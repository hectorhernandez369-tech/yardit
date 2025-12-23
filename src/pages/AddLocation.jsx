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
import { RadioGroup } from "@/components/ui/radio-group";
import { MapPin, Loader2, Navigation, Lightbulb } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import TierSelector from "../components/listing/TierSelector";
import PaymentForm from "../components/payment/PaymentForm";
import AddressFields from "../components/shared/AddressFields";
import { isHolidaySeason, containsSaleTerms } from "../components/holidays/SeasonCheck";

// Get next Friday at 12:01 AM
function getNextFriday() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(0, 1, 0, 0);
  return nextFriday;
}

// Get next Sunday at 11:59 PM
function getNextSunday() {
  const friday = getNextFriday();
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 0, 0);
  return sunday;
}

const tierPricing = {
  free: 0,
  map_pin: 4.99,
  featured: 14.99,
  neighborhood_event: 49.99
};

export default function AddLocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1); // 1: Details, 2: Tier selection, 3: Payment
  const [formData, setFormData] = useState({
    type: "yard_sale",
    tier: "map_pin",
    title: "",
    display_title: "",
    street_address: "",
    city: "",
    state: "",
    zip_code: "",
    address: "",
    latitude: null,
    longitude: null,
    description: "",
    date: "",
    viewing_start_time: "17:00",
    viewing_end_time: "22:00",
    contact_info: "",
    photos: [],
    rules_acknowledged: false,
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

  const createLocationMutation = useMutation({
    mutationFn: async ({ locationData, paymentInfo }) => {
      const friday = getNextFriday();
      const sunday = getNextSunday();
      
      // Neighborhood events get 2 weekends
      const expiresAt = locationData.tier === "neighborhood_event" 
        ? new Date(sunday.getTime() + 7 * 24 * 60 * 60 * 1000)
        : sunday;

      // Build full address
      const fullAddress = `${locationData.street_address}, ${locationData.city}, ${locationData.state} ${locationData.zip_code}`;

      const location = await base44.entities.Location.create({
        ...locationData,
        address: fullAddress,
        expires_at: expiresAt.toISOString(),
        payment_amount: tierPricing[locationData.tier],
        payment_status: locationData.tier === "free" ? "free" : "completed",
        feed_impressions: 0,
        listing_views: 0,
        map_pin_clicks: 0,
      });

      // Create payment record for paid tiers
      if (locationData.tier !== "free" && paymentInfo) {
        await base44.entities.Payment.create({
          location_id: location.id,
          amount: tierPricing[locationData.tier],
          plan: locationData.tier,
          duration_days: locationData.tier === "neighborhood_event" ? 6 : 3,
          status: "completed",
          payment_method: paymentInfo.payment_method,
          transaction_id: paymentInfo.transaction_id,
        });
      }

      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["userLocations"] });
      toast.success("Listing created successfully!");
      navigate(createPageUrl("Map"));
    },
    onError: (error) => {
      toast.error("Failed to create listing. Please try again.");
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

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            if (data.address) {
              const addr = data.address;
              const streetNum = addr.house_number || "";
              const street = addr.road || "";
              setFormData((prev) => ({
                ...prev,
                street_address: `${streetNum} ${street}`.trim(),
                city: addr.city || addr.town || addr.village || "",
                state: addr.state || "",
                zip_code: addr.postcode || "",
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
    if (!formData.street_address || !formData.city || !formData.state || !formData.zip_code) return null;

    const fullAddress = `${formData.street_address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;

    setIsGeocodingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          fullAddress
        )}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: fullAddress,
        }));
        toast.success("Address located on map!");
        return { latitude: lat, longitude: lng };
      } else {
        toast.error("Could not find address. Please verify and try again.");
        return null;
      }
    } catch (error) {
      toast.error("Error finding address.");
      console.error(error);
      return null;
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Auto-geocode when all address fields are filled
  useEffect(() => {
    if (
      formData.street_address &&
      formData.city &&
      formData.state &&
      formData.zip_code &&
      !formData.latitude &&
      !formData.longitude &&
      !isGeocodingAddress
    ) {
      const timer = setTimeout(() => {
        geocodeAddress();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timer);
    }
  }, [formData.street_address, formData.city, formData.state, formData.zip_code]);

  const handleContinueToTiers = async (e) => {
    e.preventDefault();

    // Holiday lights validation
    if (formData.type === "holiday_lights") {
      const missingFields = [];
      if (!formData.display_title) missingFields.push("Display title");
      if (!formData.viewing_start_time) missingFields.push("Viewing start time");
      if (!formData.viewing_end_time) missingFields.push("Viewing end time");
      if (!formData.street_address) missingFields.push("Street address");
      if (!formData.city) missingFields.push("City");
      if (!formData.state) missingFields.push("State");
      if (!formData.zip_code) missingFields.push("ZIP code");

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }

      if (!formData.rules_acknowledged) {
        toast.error("You must acknowledge the rules to proceed.");
        return;
      }

      if (containsSaleTerms(formData.description)) {
        toast.error("Holiday Light Display listings cannot include sale or item-related text. Please create a Yard Sale listing instead.");
        return;
      }

      let currentLat = formData.latitude;
      let currentLng = formData.longitude;

      if (!currentLat || !currentLng) {
        const geoResult = await geocodeAddress();
        if (geoResult) {
          currentLat = geoResult.latitude;
          currentLng = geoResult.longitude;
        } else {
          toast.error("Could not locate address on map. Please verify the address is correct.");
          return;
        }
      }

      // Holiday lights skip payment
      createLocationMutation.mutate({ locationData: formData, paymentInfo: null });
      return;
    }

    // Validate required fields for yard sales and other events
    const missingFields = [];
    if (!formData.title) missingFields.push("Title");
    if (!formData.street_address) missingFields.push("Street address");
    if (!formData.city) missingFields.push("City");
    if (!formData.state) missingFields.push("State");
    if (!formData.zip_code) missingFields.push("ZIP code");

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    // Try to geocode if not already done
    let currentLat = formData.latitude;
    let currentLng = formData.longitude;

    if (!currentLat || !currentLng) {
      toast.error("Locating address on map...");
      const geoResult = await geocodeAddress();
      if (geoResult) {
        currentLat = geoResult.latitude;
        currentLng = geoResult.longitude;
      } else {
        toast.error("Could not locate address. Please verify the address is correct.");
        return;
      }
    }

    // Enforce character limit for free tier
    if (formData.tier === "free" && formData.description.length > 160) {
      toast.error("Free listings have a 160 character description limit");
      return;
    }

    setStep(2);
  };

  const handleContinueToPayment = () => {
    if (formData.tier === "free") {
      createLocationMutation.mutate({ locationData: formData, paymentInfo: null });
    } else {
      setStep(3);
    }
  };

  const handlePaymentComplete = (paymentInfo) => {
    createLocationMutation.mutate({ 
      locationData: formData, 
      paymentInfo 
    });
  };

  const getPhotoLimit = () => {
    const limits = { free: 1, map_pin: 3, featured: 10, neighborhood_event: 10 };
    return limits[formData.tier] || 3;
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    s === step
                      ? "bg-gradient-to-r from-orange-500 to-purple-600 text-white"
                      : s < step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      s < step ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center gap-8 text-xs text-gray-600">
            <span className={step === 1 ? "font-semibold" : ""}>Details</span>
            <span className={step === 2 ? "font-semibold" : ""}>Choose Tier</span>
            <span className={step === 3 ? "font-semibold" : ""}>Payment</span>
          </div>
        </div>

        {step === 1 ? (
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-2xl">
                {formData.type === "holiday_lights" ? <Lightbulb className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                {formData.type === "holiday_lights" ? "Post Holiday Light Display" : "Post Your Yard Sale"}
              </CardTitle>
              <p className="text-white/90 text-sm mt-1">
                {formData.type === "holiday_lights" 
                  ? "Share your holiday lights display with the community!"
                  : "Share your sale with the community. Active Friday-Sunday this weekend!"}
              </p>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleContinueToTiers} className="space-y-6">
                {/* Type Selector */}
                <div className="space-y-2">
                  <Label>Listing Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: "yard_sale" }))}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.type === "yard_sale"
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <MapPin className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                      <p className="font-medium">Yard Sale</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isHolidaySeason()) {
                          toast.error("Holiday Light Display listings are available November 1st–January 2nd.");
                          return;
                        }
                        setFormData(prev => ({ ...prev, type: "holiday_lights" }));
                      }}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.type === "holiday_lights"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      } ${!isHolidaySeason() ? "opacity-50" : ""}`}
                    >
                      <Lightbulb className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                      <p className="font-medium">Holiday Lights</p>
                      {!isHolidaySeason() && (
                        <p className="text-xs text-gray-500 mt-1">Nov 1 - Jan 2</p>
                      )}
                    </button>
                  </div>
                </div>

                {formData.type === "holiday_lights" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="display_title">
                        Display Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="display_title"
                        placeholder="e.g., Winter Wonderland Display"
                        value={formData.display_title}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, display_title: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <p className="font-medium mb-1">🎄 Season: November 1 - January 2</p>
                      <p className="text-xs">Your display will be visible on the map during the holiday season.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="viewing_start_time">
                          Viewing Start Time <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="viewing_start_time"
                          type="time"
                          value={formData.viewing_start_time}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, viewing_start_time: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="viewing_end_time">
                          Viewing End Time <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="viewing_end_time"
                          type="time"
                          value={formData.viewing_end_time}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, viewing_end_time: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Checkbox
                        id="rules"
                        checked={formData.rules_acknowledged}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, rules_acknowledged: checked }))
                        }
                      />
                      <Label htmlFor="rules" className="text-sm cursor-pointer">
                        I live at or manage this property, I have permission to list it, and I agree not to use this listing for sales, vendors, or business activity.
                      </Label>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Multi-family Yard Sale"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                  </div>
                )}

                <AddressFields formData={formData} setFormData={setFormData} required={true} />

                <div className="flex justify-end">
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
                    Use My Location
                  </Button>
                </div>

                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location set: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </p>
                )}

                {isGeocodingAddress && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Locating address...
                  </p>
                )}

                {formData.street_address && formData.city && formData.state && formData.zip_code && !formData.latitude && !isGeocodingAddress && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={geocodeAddress}
                      variant="outline"
                      size="sm"
                    >
                      Locate on Map
                    </Button>
                  </div>
                )}

                {formData.type !== "holiday_lights" && (
                  <div className="space-y-2">
                    <Label htmlFor="date">Sale Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Listing will be active Friday-Sunday ({getNextFriday().toLocaleDateString()} - {getNextSunday().toLocaleDateString()})
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description {formData.tier === "free" && "(160 char limit)"}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you're selling..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    maxLength={formData.tier === "free" ? 160 : undefined}
                  />
                  {formData.tier === "free" && (
                    <p className="text-xs text-gray-500">
                      {formData.description.length}/160 characters
                    </p>
                  )}
                </div>

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
                    {formData.type === "holiday_lights" ? "Create Display" : "Continue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : step === 2 ? (
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl">Choose Your Listing Tier</CardTitle>
              <p className="text-white/90 text-sm mt-1">
                Select the visibility level for your yard sale
              </p>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-6">
                <RadioGroup
                  value={formData.tier}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
                >
                  <TierSelector
                    selectedTier={formData.tier}
                    onSelect={(tier) => setFormData((prev) => ({ ...prev, tier }))}
                  />
                </RadioGroup>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleContinueToPayment}
                    disabled={createLocationMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                  >
                    {formData.tier === "free" ? "Create Listing" : "Continue to Payment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PaymentForm
            amount={tierPricing[formData.tier]}
            plan={formData.tier}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setStep(2)}
            isProcessing={createLocationMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}