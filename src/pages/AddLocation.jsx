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
import { MapPin, Loader2, Navigation, ShoppingBag, Candy, DollarSign, Check } from "lucide-react";
import { toast } from "sonner";

// Check if current date is within Halloween candy season (Oct 29-31)
function isHalloweenSeason() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return month === 9 && day >= 29 && day <= 31;
}

export default function AddLocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const halloweenActive = isHalloweenSeason();

  const [step, setStep] = useState(1); // 1: Location details, 2: Payment selection
  const [formData, setFormData] = useState({
    type: "yard_sale",
    title: "",
    address: "",
    latitude: null,
    longitude: null,
    description: "",
    date: "",
    contact_info: "",
    payment_plan: "5_day",
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const createLocationMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate expiration date
      let expiresAt = null;
      let paymentAmount = 0;
      let paymentStatus = "free";

      if (data.type === "yard_sale") {
        const now = new Date();
        if (data.payment_plan === "5_day") {
          expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
          paymentAmount = 4.99;
          paymentStatus = "completed";
        } else if (data.payment_plan === "monthly") {
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          paymentAmount = 20.00;
          paymentStatus = "completed";
        }
      } else {
        paymentStatus = "free";
      }

      // Create location
      const location = await base44.entities.Location.create({
        ...data,
        expires_at: expiresAt?.toISOString(),
        payment_amount: paymentAmount,
        payment_status: paymentStatus,
      });

      // Create payment record for yard sales
      if (data.type === "yard_sale") {
        await base44.entities.Payment.create({
          location_id: location.id,
          amount: paymentAmount,
          plan: data.payment_plan,
          duration_days: data.payment_plan === "5_day" ? 5 : 30,
          status: "completed",
          payment_method: "demo", // In production, this would be actual payment method
        });
      }

      return location;
    },
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

  const handleContinueToPayment = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.address || !formData.latitude || !formData.longitude) {
      toast.error("Please fill in all required fields and set location.");
      return;
    }

    // If Halloween candy, skip payment and submit directly
    if (formData.type === "halloween_candy") {
      createLocationMutation.mutate(formData);
    } else {
      setStep(2);
    }
  };

  const handleSubmitWithPayment = () => {
    createLocationMutation.mutate(formData);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {step === 1 ? (
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MapPin className="w-6 h-6" />
                Add a New Location
              </CardTitle>
              <p className="text-white/90 text-sm mt-1">
                {halloweenActive 
                  ? "Share a yard sale or Halloween candy spot with your community!"
                  : "Share a yard sale with your community!"}
              </p>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleContinueToPayment} className="space-y-6">
                {/* Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Location Type</Label>
                  <RadioGroup
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                    className={halloweenActive ? "grid grid-cols-2 gap-4" : ""}
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
                          <p className="text-xs text-gray-500">Paid listing</p>
                        </div>
                      </div>
                    </label>

                    {halloweenActive && (
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
                            <p className="text-xs text-green-600 font-medium">Free!</p>
                          </div>
                        </div>
                      </label>
                    )}
                  </RadioGroup>
                </div>

                {/* Pricing Notice for Yard Sales */}
                {formData.type === "yard_sale" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-blue-900 mb-1">Yard Sale Listing Pricing</p>
                        <p className="text-blue-800">$4.99 for 5 days or $20 for 30 days</p>
                      </div>
                    </div>
                  </div>
                )}

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
                    {formData.type === "halloween_candy" ? (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Add to Map
                      </>
                    ) : (
                      <>
                        Continue to Payment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <DollarSign className="w-6 h-6" />
                Choose Your Plan
              </CardTitle>
              <p className="text-white/90 text-sm mt-1">
                Select the best listing duration for your yard sale
              </p>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Pricing Cards */}
                <RadioGroup
                  value={formData.payment_plan}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, payment_plan: value }))
                  }
                  className="grid md:grid-cols-2 gap-4"
                >
                  {/* 5 Day Plan */}
                  <label
                    htmlFor="5_day"
                    className={`relative cursor-pointer group ${
                      formData.payment_plan === "5_day" ? "ring-2 ring-orange-500" : ""
                    }`}
                  >
                    <Card className="h-full border-2 transition-all group-hover:border-orange-300">
                      <CardContent className="p-6">
                        <RadioGroupItem value="5_day" id="5_day" className="sr-only" />
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">5-Day Listing</h3>
                            <p className="text-3xl font-bold text-orange-600 mt-2">$4.99</p>
                            <p className="text-sm text-gray-500 mt-1">Perfect for weekend sales</p>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-2 mt-4">
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              5 days on the map
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              Full listing details
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              Contact information
                            </li>
                          </ul>
                        </div>
                        {formData.payment_plan === "5_day" && (
                          <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </label>

                  {/* Monthly Plan */}
                  <label
                    htmlFor="monthly"
                    className={`relative cursor-pointer group ${
                      formData.payment_plan === "monthly" ? "ring-2 ring-purple-600" : ""
                    }`}
                  >
                    <Card className="h-full border-2 transition-all group-hover:border-purple-300">
                      <CardContent className="p-6">
                        <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-purple-600" />
                            </div>
                            <Badge className="absolute -top-2 -right-2 bg-green-600 text-white text-xs">
                              Best Value
                            </Badge>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">30-Day Listing</h3>
                            <p className="text-3xl font-bold text-purple-600 mt-2">$20.00</p>
                            <p className="text-sm text-gray-500 mt-1">Save 33%!</p>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-2 mt-4">
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              30 days on the map
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              Full listing details
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              Contact information
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-600" />
                              Priority placement
                            </li>
                          </ul>
                        </div>
                        {formData.payment_plan === "monthly" && (
                          <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </label>
                </RadioGroup>

                {/* Demo Payment Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Demo Mode:</strong> This is a demonstration. In production, actual payment processing (Stripe, PayPal, etc.) would be integrated here.
                  </p>
                </div>

                {/* Action Buttons */}
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
                    onClick={handleSubmitWithPayment}
                    disabled={createLocationMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                  >
                    {createLocationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete & Add to Map
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}