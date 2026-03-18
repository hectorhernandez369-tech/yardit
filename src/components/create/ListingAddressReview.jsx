import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, MapPin, Navigation } from "lucide-react";
import AddressReviewMap from "@/components/create/AddressReviewMap";

export default function ListingAddressReview({
  formData,
  setFormData,
  isDemoMode,
  hasProfileAddress,
  isGettingLocation,
  isGeocoding,
  onUseCurrentLocation,
  onLocateAddress,
  addressSuggestions,
  onSelectSuggestion,
}) {
  const readOnly = !isDemoMode;
  const inputClassName = `bg-[#F3E6CF] border-[#2C4F4E] ${readOnly ? "opacity-70 cursor-not-allowed" : ""}`;

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border-2 p-4 ${readOnly ? "border-[#2C4F4E] bg-[#E7D7B8]" : "border-[#2C4F4E] bg-[#E7D7B8]"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[#2C4F4E] font-semibold">Confirm Listing Address</h3>
            <p className="text-sm text-[#1F2937] opacity-80">This is where your listing will appear on the map</p>
            {readOnly && (
              <p className="mt-2 text-sm text-[#2C4F4E] flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4" />
                Address is based on your account profile
              </p>
            )}
          </div>
          {readOnly && (
            <div className="rounded-full border border-[#2C4F4E]/20 bg-white/70 px-3 py-1 text-xs font-semibold text-[#2C4F4E]">
              Locked
            </div>
          )}
        </div>
      </div>

      {!hasProfileAddress && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Please add an address in your profile before creating a listing.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="addressText" className="text-[#2C4F4E]">Street Address</Label>
          <Input
            id="addressText"
            value={formData.addressText || ""}
            disabled={readOnly}
            onChange={(e) => setFormData((prev) => ({ ...prev, addressText: e.target.value }))}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-[#2C4F4E]">City</Label>
          <Input
            id="city"
            value={formData.city || ""}
            disabled={readOnly}
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state" className="text-[#2C4F4E]">State</Label>
            <Input
              id="state"
              value={formData.state || ""}
              disabled={readOnly}
              maxLength={2}
              onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
              className={`${inputClassName} uppercase`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip" className="text-[#2C4F4E]">ZIP Code</Label>
            <Input
              id="zip"
              value={formData.zip || ""}
              disabled={readOnly}
              onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value }))}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {isDemoMode && hasProfileAddress && (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={isGettingLocation}
            variant="outline"
            className="gap-2 border-2 border-[#2C4F4E] bg-[#F3E6CF] text-[#2C4F4E] hover:bg-[#E7D7B8]"
          >
            {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Use My Location
          </Button>
        </div>
      )}

      <AddressReviewMap
        lat={formData.lat}
        lng={formData.lng}
      />

      {typeof formData.lat === "number" && typeof formData.lng === "number" && (
        <div className="rounded-lg border border-[#2C4F4E]/40 bg-[#F3E6CF] px-3 py-2">
          <p className="text-xs text-[#2C4F4E] flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Location set: {Number(formData.lat).toFixed(4)}, {Number(formData.lng).toFixed(4)}
          </p>
        </div>
      )}

      {isDemoMode && addressSuggestions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[#2C4F4E]">Suggested Matches</Label>
          <div className="space-y-2">
            {addressSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                className="w-full rounded-lg border-2 border-[#2C4F4E] bg-[#F3E6CF] p-3 text-left transition-colors hover:bg-[#E7D7B8]"
              >
                <p className="text-sm font-medium text-[#2C4F4E]">{suggestion.place_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}