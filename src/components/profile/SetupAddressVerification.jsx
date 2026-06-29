import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import AddressFields from "@/components/shared/AddressFields";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWFyZGl0IiwiYSI6ImNta2JybmRiODA4NGszaHB4eWk1Ym51OGkifQ.EGhIAG9BvEK50uwlPNfmhA";

function extractAddressParts(feature, fallback) {
  let city = fallback.city || "";
  let state = fallback.state || "";
  let zip = fallback.zip_code || "";

  feature.context?.forEach((item) => {
    if (item.id.startsWith("place")) city = item.text;
    if (item.id.startsWith("region")) state = item.short_code?.replace("US-", "") || item.text;
    if (item.id.startsWith("postcode")) zip = item.text;
  });

  return { city, state: String(state || "").toUpperCase().slice(0, 2), zip_code: zip };
}

export default function SetupAddressVerification({ user, isVerified, onVerified }) {
  const [formData, setFormData] = useState({
    street_address: user?.street_address || "",
    city: user?.city || "",
    state: user?.state || "",
    zip_code: user?.zip_code || "",
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!formData.street_address?.trim() || !formData.city?.trim() || !formData.state?.trim() || !formData.zip_code?.trim()) {
      toast.error("Please enter a complete physical address.");
      return;
    }

    setIsVerifying(true);
    const query = [formData.street_address, formData.city, formData.state, formData.zip_code].join(", ");
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address`);
    const data = await response.json();
    const feature = data.features?.[0];

    if (!response.ok || !feature?.center || feature.place_type?.[0] !== "address") {
      setIsVerifying(false);
      toast.error("We could not verify that address. Please enter a real physical address and try again.");
      return;
    }

    const parts = extractAddressParts(feature, formData);
    const verifiedAt = new Date().toISOString();
    const addressPayload = {
      has_primary_address: true,
      primary_address_verified: true,
      primary_address: feature.place_name,
      primary_latitude: feature.center[1],
      primary_longitude: feature.center[0],
      primary_address_verified_at: verifiedAt,
      address_verification_required: false,
      street_address: formData.street_address.trim(),
      city: parts.city,
      state: parts.state,
      zip_code: parts.zip_code,
      address_lat: feature.center[1],
      address_lng: feature.center[0],
      address_confirmation_status: "confirmed",
      address: feature.place_name,
    };

    setIsVerifying(false);
    onVerified(addressPayload);
    toast.success("Address confirmed.");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[#5DADA5]/15 p-2 text-[#2C4F4E]">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Confirm your posting address</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Yardit requires a confirmed primary address before posting listings. This keeps map pins accurate and helps prevent fake listings.
          </p>
        </div>
      </div>

      <AddressFields formData={formData} setFormData={setFormData} />

      {isVerified && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          Address confirmed for listing posts.
        </div>
      )}

      <Button
        type="button"
        onClick={handleVerify}
        disabled={isVerifying}
        className="h-10 w-full rounded-xl bg-[#F4A849] font-semibold text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635]"
      >
        {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isVerifying ? "Confirming Address..." : isVerified ? "Confirm Different Address" : "Confirm Address"}
      </Button>
    </div>
  );
}