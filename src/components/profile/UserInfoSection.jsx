import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, Shield, MapPin, Loader2 } from "lucide-react";
import AddressFields from "@/components/shared/AddressFields";
import { toast } from "sonner";
import { computedAddressVerified } from "@/lib/trustActions";

export default function UserInfoSection({ user, setUser }) {
  const needsBasicInfo = !user.first_name?.trim() || !user.last_name?.trim();
  const [isEditing, setIsEditing] = useState(needsBasicInfo);
  const [isConfirmingAddress, setIsConfirmingAddress] = useState(false);

  // Use the computed helper so a stale verified flag without real address data is treated as unverified
  const isAddressConfirmed = computedAddressVerified(user);

  const [formData, setFormData] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "", 
    street_address: user.street_address || "",
    city: user.city || "",
    state: user.state || "",
    zip_code: user.zip_code || "",
    phone: user.phone || "",
    address_lat: user.address_lat || null,
    address_lng: user.address_lng || null,
    address_confirmation_status: user.address_confirmation_status || "unconfirmed",
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
      const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        
        setFormData(prev => ({ ...prev, address_lat: lat, address_lng: lng, address_confirmation_status: "confirmed" }));
        await base44.auth.updateMe({ address_lat: lat, address_lng: lng, address_confirmation_status: "confirmed" });
        setUser(prev => ({ ...prev, address_lat: lat, address_lng: lng, address_confirmation_status: "confirmed" }));
        
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
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const { street_address, city, state, zip_code } = formData;

    if (!firstName || !lastName) {
      toast.error("First and last name are required to finish account setup.");
      return;
    }

    const hasAnyAddress = !!(street_address || city || state || zip_code);
    if (hasAnyAddress && (!street_address || !city || !state || !zip_code)) {
      toast.error("Please complete street, city, state, and zip before saving your address.");
      return;
    }

    const addressChanged = 
      street_address !== user.street_address ||
      city !== user.city ||
      state !== user.state ||
      zip_code !== user.zip_code;

    let currentData = {
      ...formData,
      first_name: firstName,
      last_name: lastName,
      address: [formData.street_address, formData.city, formData.state, formData.zip_code].filter(Boolean).join(", "),
    };

    if (hasAnyAddress && (addressChanged || !formData.address_lat || !formData.address_lng)) {
      const coords = await confirmAddress();
      if (!coords) return;
      currentData.address_lat = coords.lat;
      currentData.address_lng = coords.lng;
      currentData.address_confirmation_status = "confirmed";
    }

    updateUserMutation.mutate(currentData);
  };

  const handleCancel = () => {
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "", 
      street_address: user.street_address || "",
      city: user.city || "",
      state: user.state || "",
      zip_code: user.zip_code || "",
      phone: user.phone || "",
      address_lat: user.address_lat || null,
      address_lng: user.address_lng || null,
      address_confirmation_status: user.address_confirmation_status || "unconfirmed",
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
                disabled={updateUserMutation.isPending || needsBasicInfo}
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
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
              {isEditing ? (
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                  placeholder="First name"
                />
              ) : (
                <p className="text-lg font-medium">{user.first_name || "Not set"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
              {isEditing ? (
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Last name"
                />
              ) : (
                <p className="text-lg font-medium">{user.last_name || "Not set"}</p>
              )}
            </div>
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
              {isAddressConfirmed ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Address Confirmed</Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Address Not Confirmed</Badge>
              )}
            </div>
            
            {!isAddressConfirmed && (
              <p className="text-xs text-orange-600 mb-2">Confirm your address when you’re ready to create live listings.</p>
            )}

            {isEditing ? (
              <div className="space-y-4 pt-2">
                <AddressFields formData={formData} setFormData={(updater) => {
                  setFormData((prev) => {
                    const next = typeof updater === "function" ? updater(prev) : updater;
                    return { ...next, address_lat: null, address_lng: null, address_confirmation_status: "unconfirmed" };
                  });
                }} />
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
                {!isAddressConfirmed && user.street_address && (
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