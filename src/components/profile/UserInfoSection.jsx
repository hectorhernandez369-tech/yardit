import React, { useEffect, useState } from "react";
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
import { buildVerifiedAddressUpdate, normalizeUser } from "@/lib/normalizeUser";
import { getNameValidationError, getPhoneValidationError } from "@/lib/profileValidation";
import { createPageUrl } from "@/utils";

export default function UserInfoSection({ user, setUser, addressEditSignal = 0 }) {
  const normalizedUser = normalizeUser(user);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingAddress, setIsConfirmingAddress] = useState(false);
  const [addressChangeLock, setAddressChangeLock] = useState(null);

  // Use the computed helper so a stale verified flag without real address data is treated as unverified
  const isAddressConfirmed = computedAddressVerified(normalizedUser);

  const [formData, setFormData] = useState({
    first_name: normalizedUser.first_name || "",
    last_name: normalizedUser.last_name || "", 
    street_address: normalizedUser.street_address || "",
    city: normalizedUser.city || "",
    state: normalizedUser.state || "",
    zip_code: normalizedUser.zip_code || "",
    phone: normalizedUser.phone || "",
    address_lat: normalizedUser.address_lat || null,
    address_lng: normalizedUser.address_lng || null,
    address_confirmation_status: normalizedUser.address_confirmation_status || "unconfirmed",
  });

  const profileValuesValid = Boolean(
    !getNameValidationError(formData.first_name, "First name") &&
    !getNameValidationError(formData.last_name, "Last name") &&
    !getPhoneValidationError(formData.phone) &&
    formData.street_address?.trim() &&
    formData.city?.trim() &&
    formData.state?.trim() &&
    formData.zip_code?.trim()
  );

  useEffect(() => {
    if (addressEditSignal > 0) {
      setIsEditing(true);
    }
  }, [addressEditSignal]);

  const requestPreciseLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS location is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyFeet: Number(position.coords.accuracy || 0) * 3.28084,
      }),
      (error) => {
        const denied = error?.code === 1;
        reject(new Error(denied
          ? "Location permission is required to change your primary address."
          : "We couldn't get a reliable GPS location. Please try again outside or near a window."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

  const confirmAddress = async () => {
    const { street_address, city, state, zip_code } = formData;
    if (!street_address || !city || !state || !zip_code) {
      toast.error("Please fill out street, city, state, and zip before confirming.");
      return null;
    }

    const addressChanged =
      street_address.trim() !== String(normalizedUser.street_address || "").trim() ||
      city.trim() !== String(normalizedUser.city || "").trim() ||
      state.trim().toUpperCase() !== String(normalizedUser.state || "").trim().toUpperCase() ||
      zip_code.trim() !== String(normalizedUser.zip_code || "").trim();

    if (!addressChanged && isAddressConfirmed) {
      return { unchanged: true };
    }

    // First-time verification keeps the existing low-friction Mapbox flow.
    if (!isAddressConfirmed) {
      setIsConfirmingAddress(true);
      const query = `${street_address}, ${city}, ${state}, ${zip_code}`;
      try {
        const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&types=address&access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        const feature = data?.features?.[0];

        if (!response.ok || !feature?.center || feature.place_type?.[0] !== "address") {
          toast.error("Could not confirm that physical address. Please double-check it.");
          return null;
        }

        const [lng, lat] = feature.center;
        const formattedAddress = feature.place_name || query;
        const verifiedAt = new Date().toISOString();
        const confirmedAddressData = {
          street_address: street_address.trim(),
          street: street_address.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          zip_code: zip_code.trim(),
          zip: zip_code.trim(),
          address_lat: lat,
          address_lng: lng,
          latitude: lat,
          longitude: lng,
          address_confirmation_status: "confirmed",
          has_primary_address: true,
          primary_address_verified: true,
          address_verified: true,
          primary_address: formattedAddress,
          primary_latitude: lat,
          primary_longitude: lng,
          primary_address_verified_at: verifiedAt,
          address_verification_required: false,
          address: formattedAddress,
        };

        setFormData((prev) => ({ ...prev, ...confirmedAddressData }));
        await base44.auth.updateMe(buildVerifiedAddressUpdate(confirmedAddressData, user));
        const refreshedUser = normalizeUser(await base44.auth.me());
        setUser(refreshedUser);
        window.dispatchEvent(new CustomEvent("yardit:user-updated", { detail: refreshedUser }));
        setIsEditing(false);
        toast.success("Address confirmed and saved!");
        return { lat, lng, confirmedAddressData };
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Failed to confirm address.");
        return null;
      } finally {
        setIsConfirmingAddress(false);
      }
    }

    // Existing verified address: require GPS + server-side annual lock.
    setIsConfirmingAddress(true);
    setAddressChangeLock(null);
    try {
      const gps = await requestPreciseLocation();
      const response = await base44.functions.invoke("changePrimaryAddress", {
        street_address: street_address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zip_code.trim(),
        gps_lat: gps.lat,
        gps_lng: gps.lng,
        gps_accuracy_feet: gps.accuracyFeet,
      });

      const updatedAddress = response?.data?.address || {};
      const refreshedUser = normalizeUser(await base44.auth.me());
      setFormData((prev) => ({
        ...prev,
        street_address: refreshedUser.street_address || updatedAddress.street_address || prev.street_address,
        city: refreshedUser.city || updatedAddress.city || prev.city,
        state: refreshedUser.state || updatedAddress.state || prev.state,
        zip_code: refreshedUser.zip_code || updatedAddress.zip_code || prev.zip_code,
        address_lat: refreshedUser.address_lat ?? updatedAddress.address_lat ?? null,
        address_lng: refreshedUser.address_lng ?? updatedAddress.address_lng ?? null,
        address_confirmation_status: "confirmed",
      }));
      setUser(refreshedUser);
      window.dispatchEvent(new CustomEvent("yardit:user-updated", { detail: refreshedUser }));
      setIsEditing(false);
      toast.success("Primary address changed and GPS verified.");
      return { gpsVerified: true };
    } catch (err) {
      const data = err?.response?.data || {};
      if (data?.code === "address_change_locked") {
        setAddressChangeLock({ nextAllowedAt: data.next_allowed_at || null });
      }
      toast.error(data?.error || err?.message || "Could not change your primary address.");
      return null;
    } finally {
      setIsConfirmingAddress(false);
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async () => {
      const refreshedUser = normalizeUser(await base44.auth.me());
      setUser(refreshedUser);
      window.dispatchEvent(new CustomEvent("yardit:user-updated", { detail: refreshedUser }));
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
    const nameError = getNameValidationError(formData.first_name, "First name") || getNameValidationError(formData.last_name, "Last name");
    const phoneError = getPhoneValidationError(formData.phone);

    if (nameError || phoneError) {
      toast.error(nameError || phoneError);
      return;
    }
    
    if (!street_address || !city || !state || !zip_code) {
      toast.error("A complete address (street, city, state, zip) is required to finish account setup.");
      return;
    }

    const addressChanged = 
      street_address !== normalizedUser.street_address ||
      city !== normalizedUser.city ||
      state !== normalizedUser.state ||
      zip_code !== normalizedUser.zip_code;

    let currentData = {
      ...formData,
      phone_number: formData.phone.trim(),
      address: [formData.street_address, formData.city, formData.state, formData.zip_code].filter(Boolean).join(", "),
    };

    if (addressChanged || !formData.address_lat || !formData.address_lng) {
      const addressResult = await confirmAddress();
      if (!addressResult) return;

      // Address changes are already saved by the secure server function.
      // Only save the non-address profile fields afterward.
      if (addressChanged && isAddressConfirmed) {
        updateUserMutation.mutate({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          phone_number: formData.phone.trim(),
        });
        return;
      }

      currentData = { ...currentData, ...(addressResult.confirmedAddressData || {}) };
    }

    updateUserMutation.mutate(currentData);
  };

  const handleCancel = () => {
    setFormData({
      first_name: normalizedUser.first_name || "",
      last_name: normalizedUser.last_name || "", 
      street_address: normalizedUser.street_address || "",
      city: normalizedUser.city || "",
      state: normalizedUser.state || "",
      zip_code: normalizedUser.zip_code || "",
      phone: normalizedUser.phone || "",
      address_lat: normalizedUser.address_lat || null,
      address_lng: normalizedUser.address_lng || null,
      address_confirmation_status: normalizedUser.address_confirmation_status || "unconfirmed",
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
                disabled={updateUserMutation.isPending || isConfirmingAddress || !profileValuesValid}
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
              <Label htmlFor="first_name">First Name *</Label>
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
              <Label htmlFor="last_name">Last Name *</Label>
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
            <Label htmlFor="phone">Phone Number *</Label>
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
              <p className="text-xs text-orange-600 mb-2">Confirm your address to finish account setup and create live listings.</p>
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
                  {isConfirmingAddress
                    ? "Confirming..."
                    : isAddressConfirmed
                    ? "Verify New Address with GPS"
                    : "Confirm Address"}
                </Button>
                {isAddressConfirmed && (
                  <p className="text-xs text-slate-500">
                    Primary address changes require your phone's GPS and are limited to one self-service change every 365 days.
                  </p>
                )}
                {addressChangeLock && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-semibold">Address change review required</p>
                    <p className="mt-1">
                      {addressChangeLock.nextAllowedAt
                        ? `Your next self-service change is available ${new Date(addressChangeLock.nextAllowedAt).toLocaleDateString()}.`
                        : "Your annual self-service address change is not available yet."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-amber-300 bg-white text-amber-900"
                      onClick={() => {
                        window.location.href = `${createPageUrl("ContactSupport")}?area=residential&from=profile-address-change&address_change_review=1`;
                      }}
                    >
                      Request Address Change Review
                    </Button>
                  </div>
                )}
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