import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, Shield, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UserInfoSection({ user, setUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingAddress, setIsConfirmingAddress] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    street_address: user.street_address || "",
    city: user.city || "",
    state: user.state || "",
    zip_code: user.zip_code || "",
    phone: user.phone || "",
    address_lat: user.address_lat || null,
    address_lng: user.address_lng || null,
  });

  const confirmAddress = async () => {
    const { street_address, city, state, zip_code } = formData;
    if (!street_address || !city || !state || !zip_code) {
      toast.error("Please fill out street, city, state, and zip before confirming.");
      return null;
    }

    setIsConfirmingAddress(true);
    const query = `${street_address}, ${city}, ${state}, ${zip_code}`;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        setFormData(prev => ({ ...prev, address_lat: lat, address_lng: lng }));
        await base44.auth.updateMe({ address_lat: lat, address_lng: lng });
        setUser(prev => ({ ...prev, address_lat: lat, address_lng: lng }));
        
        toast.success("Address confirmed and saved!");
        return { lat, lng };
      } else {
        toast.error("Could not confirm address. Please double-check it.");
        return null;
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to confirm address due to a network error.");
      return null;
    } finally {
      setIsConfirmingAddress(false);
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile. Please try again.");
      console.error(error);
    },
  });

  const handleSave = async () => {
    const { street_address, city, state, zip_code } = formData;
    
    if (!street_address || !city || !state || !zip_code) {
      toast.error("A complete address (street, city, state, zip) is required.");
      return;
    }

    const addressChanged = 
      street_address !== user.street_address ||
      city !== user.city ||
      state !== user.state ||
      zip_code !== user.zip_code;

    let currentData = { ...formData };

    if (addressChanged || !formData.address_lat || !formData.address_lng) {
      const coords = await confirmAddress();
      if (!coords) return; // Stop if confirmation fails
      currentData.address_lat = coords.lat;
      currentData.address_lng = coords.lng;
    }

    updateUserMutation.mutate(currentData);
  };

  const handleCancel = () => {
    setFormData({
      full_name: user.full_name || "",
      street_address: user.street_address || "",
      city: user.city || "",
      state: user.state || "",
      zip_code: user.zip_code || "",
      phone: user.phone || "",
      address_lat: user.address_lat || null,
      address_lng: user.address_lng || null,
    });
    setIsEditing(false);
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Personal Information
          </CardTitle>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateUserMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateUserMutation.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            {isEditing ? (
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Enter your full name"
              />
            ) : (
              <p className="text-lg font-medium">{user.full_name || "Not set"}</p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex items-center gap-2">
              <p className="text-lg font-medium text-gray-700">{user.email}</p>
              <Badge variant="outline" className="text-xs">
                Verified
              </Badge>
            </div>
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Account Role</Label>
            <div className="flex items-center gap-2">
              <Badge
                variant={user.role === "admin" ? "default" : "secondary"}
                className="gap-1"
              >
                <Shield className="w-3 h-3" />
                {user.role === "admin" ? "Administrator" : "User"}
              </Badge>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            {isEditing ? (
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="(555) 123-4567"
              />
            ) : (
              <p className="text-lg font-medium">{user.phone || "Not set"}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Address</Label>
              {(isEditing ? formData.address_lat && formData.address_lng : user.address_lat && user.address_lng) ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Address Confirmed</Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Address Not Confirmed</Badge>
              )}
            </div>
            
            {!(isEditing ? formData.address_lat && formData.address_lng : user.address_lat && user.address_lng) && (
              <p className="text-xs text-orange-600 mb-2">Confirm your address to enable Neighborhood Sales</p>
            )}

            {isEditing ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="street_address">Street Address</Label>
                  <Input
                    id="street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value, address_lat: null, address_lng: null }))}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value, address_lat: null, address_lng: null }))}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value, address_lat: null, address_lng: null }))}
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value, address_lat: null, address_lng: null }))}
                    placeholder="Zip Code"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={confirmAddress}
                  disabled={isConfirmingAddress}
                  className="w-full gap-2"
                >
                  {isConfirmingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {isConfirmingAddress ? "Confirming..." : "Confirm Address"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-lg font-medium">
                  {user.street_address && user.city && user.state && user.zip_code
                    ? `${user.street_address}, ${user.city}, ${user.state} ${user.zip_code}`
                    : "Not set"}
                </p>
                {(!user.address_lat || !user.address_lng) && user.street_address && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={confirmAddress}
                    disabled={isConfirmingAddress}
                    className="gap-2"
                  >
                    {isConfirmingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    {isConfirmingAddress ? "Confirming..." : "Confirm Address"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Account Stats */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="text-lg font-bold text-orange-600">
                  {new Date(user.created_date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">User ID</p>
                <p className="text-xs font-mono text-purple-600 truncate">
                  {user.id?.slice(0, 12)}...
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}