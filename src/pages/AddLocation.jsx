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
import { MapPin, Loader2, Navigation } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import TierSelector from "../components/listing/TierSelector";
import PaymentForm from "../components/payment/PaymentForm";
import AddressFields from "../components/shared/AddressFields";


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
    street_address: "",
    city: "",
    state: "",
    zip_code: "",
    address: "",
    latitude: null,
    longitude: null,
    description: "",
    date: "",
    start_time: "08:00",
    contact_info: "",
    photos: [],
    early_activation: false,
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
    if (!formData.street_address || !formData.city || !formData.state || !formData.zip_code) {
      toast.error("Please enter Street Address, City, State, and ZIP.");
      return null;
    }

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
        const latitude = parseFloat(data[0].lat);
        const longitude = parseFloat(data[0].lon);
        
        // Update state immediately
        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
          address: fullAddress,
        }));
        
        toast.success("Address located on map!");
        return { latitude, longitude };
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

    // Validate required fields
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
    if (!formData.latitude || !formData.longitude) {
      toast.error("Locating address on map...");
      const geoResult = await geocodeAddress();
      if (!geoResult) {
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
    // Validate date/time selection
    if (!formData.date) {
      toast.error("Please select a start date");
      return;
    }

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
            <CardHeader className="text-white rounded-t-lg border-b-4" style={{ backgroundColor: '#5DCCB5', borderColor: '#E84A3F' }}>
              <CardTitle className="flex items-center gap-2 text-2xl" style={{ color: '#2C3E50' }}>
                <MapPin className="w-6 h-6" />
                Post Your Yard Sale
              </CardTitle>
              <p className="text-white/90 text-sm mt-1">
                Share your sale with the community. Active Friday-Sunday this weekend!
              </p>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleContinueToTiers} className="space-y-6">
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
                    className="flex-1 text-white border-2 hover:opacity-90"
                    style={{ backgroundColor: '#E84A3F', borderColor: '#2C3E50' }}
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : step === 2 ? (
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-white rounded-t-lg border-b-4" style={{ backgroundColor: '#5DCCB5', borderColor: '#E84A3F' }}>
              <CardTitle className="text-2xl" style={{ color: '#2C3E50' }}>Choose Your Listing Tier</CardTitle>
              <p className="text-sm mt-1" style={{ color: '#2C3E50', opacity: 0.8 }}>
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

                {/* Date/Time Selection - Tier-Based Rules */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <h3 className="font-semibold text-gray-900">Select Active Days</h3>
                  
                  {formData.tier === "free" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date (Weekend Only)</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.date}
                          min={getNextFriday().toISOString().split('T')[0]}
                          max={getNextSunday().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const selectedDate = new Date(e.target.value);
                            const dayOfWeek = selectedDate.getDay();
                            // Only allow Friday (5), Saturday (6), Sunday (0)
                            if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
                              setFormData((prev) => ({ ...prev, date: e.target.value }));
                            } else {
                              toast.error("Free listings can only start on Friday, Saturday, or Sunday");
                            }
                          }}
                          required
                        />
                        <p className="text-xs text-blue-600">
                          Free listings run Friday–Sunday only ({getNextFriday().toLocaleDateString()} - {getNextSunday().toLocaleDateString()})
                        </p>
                      </div>
                    </>
                  )}

                  {formData.tier === "featured" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.date}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                          required
                        />
                        <p className="text-xs text-blue-600">
                          Featured listings run for 3 consecutive days. Select your start date.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time || "08:00"}
                          onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {formData.tier === "premium" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.date}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                          required
                        />
                        <p className="text-xs text-blue-600">
                          Premium listings run for up to 5 days. You can optionally activate 2-3 days before your start date for early visibility.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time || "08:00"}
                          onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <Checkbox
                          id="early_activation"
                          checked={formData.early_activation || false}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, early_activation: checked }))
                          }
                        />
                        <Label htmlFor="early_activation" className="text-sm cursor-pointer">
                          Enable early activation (2-3 days before start date for maximum visibility)
                        </Label>
                      </div>
                    </>
                  )}

                  {formData.tier === "map_pin" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.date}
                          min={getNextFriday().toISOString().split('T')[0]}
                          max={getNextSunday().toISOString().split('T')[0]}
                          onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                          required
                        />
                        <p className="text-xs text-blue-600">
                          Map Pin listings are active Friday–Sunday ({getNextFriday().toLocaleDateString()} - {getNextSunday().toLocaleDateString()})
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time || "08:00"}
                          onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </div>

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
                    className="flex-1 text-white border-2 hover:opacity-90"
                    style={{ backgroundColor: '#E84A3F', borderColor: '#2C3E50' }}
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