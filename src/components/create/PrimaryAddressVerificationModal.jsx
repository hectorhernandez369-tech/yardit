import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function PrimaryAddressVerificationModal({ open, initialUser, onVerified }) {
  const [formData, setFormData] = useState({
    street_address: initialUser?.street_address || "",
    city: initialUser?.city || "",
    state: initialUser?.state || "",
    zip_code: initialUser?.zip_code || "",
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

    const formattedAddress = feature.place_name;
    const latitude = feature.center[1];
    const longitude = feature.center[0];
    const parts = extractAddressParts(feature, formData);
    const verifiedAt = new Date().toISOString();
    const updatedUser = {
      has_primary_address: true,
      primary_address_verified: true,
      primary_address: formattedAddress,
      primary_latitude: latitude,
      primary_longitude: longitude,
      primary_address_verified_at: verifiedAt,
      address_verification_required: false,
      street_address: formData.street_address.trim(),
      city: parts.city,
      state: parts.state,
      zip_code: parts.zip_code,
      address_lat: latitude,
      address_lng: longitude,
      address_confirmation_status: "confirmed",
      address: formattedAddress,
    };

    await base44.auth.updateMe(updatedUser);
    setIsVerifying(false);
    toast.success("Primary address verified.");
    onVerified(updatedUser);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg bg-[#F3E6CF] border-2 border-[#2C4F4E]" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#2C4F4E]">
            <ShieldCheck className="w-5 h-5" />
            Verify your primary address
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#2C4F4E]/30 bg-white/70 p-4 text-sm text-[#1F2937] leading-relaxed">
            Before you can post a listing, Yardit needs to verify your primary address. This helps keep map pins accurate, prevents fake listings, and protects buyers and sellers. Please use a real physical address connected to you. Temporary, random, or unrelated addresses may cause your listing to be removed.
          </div>

          <AddressFields formData={formData} setFormData={setFormData} />

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            This address is used to verify your account for posting. Yardit will save the formatted address and map location before continuing.
          </div>

          <Button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isVerifying ? "Verifying Address..." : "Verify Address and Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}