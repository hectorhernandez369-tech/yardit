import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import AddressFields from "@/components/shared/AddressFields";
import { Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getStateAbbreviation } from "@/lib/listingLocation";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

function extractAddressParts(feature, fallback) {
  let city = fallback.city || "";
  let state = fallback.state || "";
  let zipCode = fallback.zip_code || "";

  feature.context?.forEach((item) => {
    if (item.id.startsWith("place")) city = item.text;
    if (item.id.startsWith("region")) state = getStateAbbreviation(item.text);
    if (item.id.startsWith("postcode")) zipCode = item.text;
  });

  return {
    street_address: feature.address ? `${feature.address} ${feature.text}` : fallback.street_address,
    city,
    state: getStateAbbreviation(state),
    zip_code: zipCode,
  };
}

export default function PrimaryAddressVerificationGate({ user, onVerified }) {
  const [formData, setFormData] = useState({
    street_address: user?.street_address || "",
    city: user?.city || "",
    state: getStateAbbreviation(user?.state || ""),
    zip_code: user?.zip_code || "",
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(!!user?.listing_rules_agreed_at);

  const handleVerifyAddress = async () => {
    const query = [formData.street_address, formData.city, formData.state, formData.zip_code]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", ");

    if (!formData.street_address || !formData.city || !formData.state || !formData.zip_code) {
      toast.error("Please enter your full physical address.");
      return;
    }

    if (!agreedToRules) {
      toast.error("Please agree to the Yardit listing rules before continuing.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address`
      );
      const data = await response.json();
      const feature = data.features?.[0];

      if (!feature?.center || !feature.address) {
        toast.error("We could not verify that as a physical street address. Please check it and try again.");
        return;
      }

      const [longitude, latitude] = feature.center;
      const formattedAddress = feature.place_name;
      const addressParts = extractAddressParts(feature, formData);
      const verifiedAt = new Date().toISOString();

      const profileUpdate = {
        has_primary_address: true,
        primary_address: formattedAddress,
        primary_latitude: latitude,
        primary_longitude: longitude,
        primary_address_verified_at: verifiedAt,
        listing_rules_agreed_at: user?.listing_rules_agreed_at || verifiedAt,
        address_verification_required: false,
        street_address: addressParts.street_address,
        city: addressParts.city,
        state: addressParts.state,
        zip_code: addressParts.zip_code,
        address_lat: latitude,
        address_lng: longitude,
        address_confirmation_status: "confirmed",
        address: formattedAddress,
      };

      await base44.auth.updateMe(profileUpdate);
      toast.success("Primary address verified. You can now continue creating your listing.");
      onVerified({ ...user, ...profileUpdate });
    } catch (error) {
      toast.error("Address verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-2 border-[#2C4F4E] bg-[#F3E6CF] shadow-xl">
        <CardHeader className="bg-[#5DADA5] text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="w-6 h-6" />
            Verify your primary address
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="rounded-xl border border-[#2C4F4E]/25 bg-[#E7D7B8] p-4 text-[#2C4F4E]">
            <p className="leading-relaxed">
              Yardit requires a verified primary address before posting listings. This helps keep map pins accurate and prevents fake or spam listings.
            </p>
          </div>

          <div className="space-y-4">
            <AddressFields formData={formData} setFormData={setFormData} />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-[#2C4F4E]/20 bg-white p-4 text-sm text-[#2C4F4E]">
            <Checkbox checked={agreedToRules} onCheckedChange={(checked) => setAgreedToRules(checked === true)} className="mt-0.5" />
            <span>I agree to Yardit’s listing rules and will only post accurate, respectful, and up-to-date listings.</span>
          </label>

          <Button
            type="button"
            onClick={handleVerifyAddress}
            disabled={isVerifying}
            className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {isVerifying ? "Verifying Address..." : "Verify Address & Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}