import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Camera, X, Search, MapPin } from "lucide-react";
import AssistedListingQRPanel from "@/components/admin/assisted/AssistedListingQRPanel";
import AdminAddressSearch from "@/components/admin/assisted/AdminAddressSearch";
import AdminPinDropMap from "@/components/admin/assisted/AdminPinDropMap";

const FALLBACK_TZ = "America/Los_Angeles";

// Tiers per listing type
const TIER_OPTIONS = {
  yard_sale: [
    { value: "free", label: "Free" },
    { value: "featured", label: "Featured ($4.99)" },
    { value: "premium", label: "Premium ($7.99)" },
  ],
  neighborhood_sale: [
    { value: "neighborhood_tier", label: "Neighborhood Sale" },
  ],
  event: [
    { value: "basic", label: "Basic (Free)" },
    { value: "featured", label: "Featured ($9.99)" },
    { value: "premium", label: "Premium ($19.99)" },
    { value: "marquee", label: "Marquee ($49.99)" },
  ],
};

const DEFAULT_TIERS = {
  yard_sale: "free",
  neighborhood_sale: "neighborhood_tier",
  event: "basic",
};

const DEFAULT_TITLES = {
  yard_sale: "Yard Sale",
  neighborhood_sale: "Neighborhood Sale",
  event: "Community Event",
};

const EMPTY_FORM = {
  listingType: "yard_sale",
  tier: "free",
  addressText: "",
  city: "",
  state: "",
  zip: "",
  lat: "",
  lng: "",
  title: "Yard Sale",
  description: "",
  photoUrls: [],
  startDateTime: "",
  endDateTime: "",
  sellerName: "",
  sellerPhone: "",
  sellerEmail: "",
  adminNotes: "",
  sellerPermissionConfirmed: true,
};

export default function AdminAssistedListingForm({ adminUser }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [addressMethod, setAddressMethod] = useState("search"); // "search" | "pin"
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [pinLocation, setPinLocation] = useState(null); // { lat, lng, street, city, state, zip, formatted, hasFullAddress }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleListingTypeChange = (value) => {
    setForm((p) => ({
      ...p,
      listingType: value,
      tier: DEFAULT_TIERS[value] || "free",
      title: p.title === DEFAULT_TITLES[p.listingType] ? DEFAULT_TITLES[value] : p.title,
    }));
  };

  const handleAddressSelected = (parsed) => {
    setSelectedAddress(parsed);
    if (parsed) {
      setForm((p) => ({
        ...p,
        addressText: parsed.street || parsed.formatted,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        lat: String(parsed.lat),
        lng: String(parsed.lng),
      }));
    } else {
      setForm((p) => ({ ...p, addressText: "", city: "", state: "", zip: "", lat: "", lng: "" }));
    }
  };

  const handlePinLocation = (loc) => {
    setPinLocation(loc);
  };

  const handleAddressMethodChange = (method) => {
    setAddressMethod(method);
    // Reset location state when switching methods to prevent mixing
    if (method === "search") {
      // Switching to search: clear pin location
      setPinLocation(null);
      setForm((p) => ({ ...p, lat: "", lng: "" }));
    } else {
      // Switching to pin: clear search address
      setSelectedAddress(null);
      setForm((p) => ({ ...p, addressText: "", city: "", state: "", zip: "", lat: "", lng: "" }));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("photoUrls", [...form.photoUrls, file_url]);
    } catch {
      toast.error("Photo upload failed");
    }
    setIsUploadingPhoto(false);
    photoInputRef.current.value = "";
  };

  const removePhoto = (idx) => {
    update("photoUrls", form.photoUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (addressMethod === "search" && !selectedAddress) {
      toast.error("Search and select an address before creating the listing.");
      return;
    }
    if (addressMethod === "pin" && !pinLocation) {
      toast.error("Drop a pin on the map to set the location.");
      return;
    }
    if (!form.title) {
      toast.error("Title is required.");
      return;
    }
    if (!form.startDateTime || !form.endDateTime) {
      toast.error("Start and end date/time are required.");
      return;
    }

    // Build ONE final location object from the active method only
    const finalLocation = addressMethod === "pin" ? pinLocation : selectedAddress;
    
    // Debug logging
    console.log("[AssistedListing] Submit Debug:", {
      addressMethod,
      selectedLocation: selectedAddress,
      pinLocation,
      finalLocation,
    });

    let addrPayload;
    if (addressMethod === "pin" && finalLocation) {
      // Use ONLY pin location data
      addrPayload = {
        lat: finalLocation.lat,
        lng: finalLocation.lng,
        addressText: finalLocation.street || "Approximate Yard Sale Location",
        city: finalLocation.city || "",
        state: finalLocation.state || "",
        zip: finalLocation.zip || "",
        location_source: "map_pin",
        saleFormattedAddress: finalLocation.formatted || "Approximate Yard Sale Location",
      };
    } else if (addressMethod === "search" && finalLocation) {
      // Use ONLY search address data
      addrPayload = {
        lat: parseFloat(finalLocation.lat),
        lng: parseFloat(finalLocation.lng),
        addressText: finalLocation.street || finalLocation.formatted,
        city: finalLocation.city || "",
        state: finalLocation.state || "",
        zip: finalLocation.zip || "",
        location_source: "address_search",
        saleFormattedAddress: finalLocation.formatted || "",
      };
    } else {
      toast.error("Location data is missing. Please select an address or drop a pin.");
      setIsSubmitting(false);
      return;
    }

    // Debug final payload
    console.log("[AssistedListing] Final Payload:", {
      lat: addrPayload.lat,
      lng: addrPayload.lng,
      addressText: addrPayload.addressText,
      display_address: addrPayload.saleFormattedAddress,
      location_source: addrPayload.location_source,
    });

    setIsSubmitting(true);
    try {
      const response = await base44.functions.invoke("createAssistedListing", {
        listingType: form.listingType,
        tier: form.tier,
        ...addrPayload,
        timeZoneId: FALLBACK_TZ,
        title: form.title,
        description: form.description,
        photoUrls: form.photoUrls,
        startDateTime: form.startDateTime,
        endDateTime: form.endDateTime,
        selectedRangeStartDate: form.startDateTime.slice(0, 10),
        selectedRangeEndDate: form.endDateTime.slice(0, 10),
        sellerName: form.sellerName,
        sellerPhone: form.sellerPhone,
        sellerEmail: form.sellerEmail,
        adminNotes: form.adminNotes,
        sellerPermissionConfirmed: form.sellerPermissionConfirmed,
      });

      setCreated({
        token: response.data.token,
        listingId: response.data.listingId,
        assistedId: response.data.assistedId,
        expiresAt: response.data.expiresAt,
        saleAddress: response.data.saleFormattedAddress || addrPayload.saleFormattedAddress,
        title: form.title,
      });

      toast.success("Assisted listing created! Show the QR code to the seller.");
    } catch (err) {
      const errData = err?.response?.data;
      const message = errData?.error || err.message || "Failed to create listing";
      const debug = errData?.debug;
      if (debug) {
        console.error("[AssistedListing] Access denied debug:", debug);
        toast.error(
          `${message}\n\nBase44 role: ${debug.base44_role ?? "unknown"} | AdminProfile role: ${debug.admin_profile_role ?? "none"} | Required: ${debug.required_role ?? debug.required ?? "master"}`,
          { duration: 8000 }
        );
      } else {
        toast.error(message);
      }
    }
    setIsSubmitting(false);
  };

  const handleReset = () => {
    setCreated(null);
    setForm({ ...EMPTY_FORM });
    setSelectedAddress(null);
    setPinLocation(null);
    setAddressMethod("search");
  };

  if (created) {
    return <AssistedListingQRPanel created={created} onCreateAnother={handleReset} />;
  }

  const tierOptions = TIER_OPTIONS[form.listingType] || TIER_OPTIONS.yard_sale;

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Admin Only:</strong> This creates a free promotional listing on behalf of a seller who has given verbal permission. A QR code will be generated for the seller to approve and claim.
      </div>

      {/* Listing Type & Tier */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#2C4F4E]">Listing Type & Tier</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-gray-500">Listing Type</Label>
            <Select value={form.listingType} onValueChange={handleListingTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yard_sale">Yard Sale</SelectItem>
                <SelectItem value="neighborhood_sale">Neighborhood Sale</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-gray-500">Tier (Admin Override)</Label>
            <Select value={form.tier} onValueChange={(v) => update("tier", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tierOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#2C4F4E]">Address</h3>

        {/* Method Toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
          <button
            type="button"
            onClick={() => handleAddressMethodChange("search")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              addressMethod === "search"
                ? "bg-[#5DADA5] text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Search Address
          </button>
          <button
            type="button"
            onClick={() => handleAddressMethodChange("pin")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              addressMethod === "pin"
                ? "bg-[#5DADA5] text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Drop Pin on Map
          </button>
        </div>

        {addressMethod === "search" && (
          <AdminAddressSearch onAddressSelected={handleAddressSelected} selectedAddress={selectedAddress} />
        )}

        {addressMethod === "pin" && (
          <AdminPinDropMap onLocationSelected={handlePinLocation} />
        )}
      </div>

      {/* Listing Details */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#2C4F4E]">Listing Details</h3>
        <Input placeholder="Title" value={form.title} onChange={e => update("title", e.target.value)} />
        <Textarea placeholder="Description (optional)" value={form.description} onChange={e => update("description", e.target.value)} rows={3} />
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#2C4F4E]">Photos (optional)</h3>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto}>
          {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Camera className="w-4 h-4 mr-1" />}
          {isUploadingPhoto ? "Uploading..." : "Add Photo"}
        </Button>
        {form.photoUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.photoUrls.map((url, idx) => (
              <div key={idx} className="relative">
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                <button onClick={() => removePhoto(idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date & Time */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#2C4F4E]">
          {form.listingType === "event" ? "Event" : "Sale"} Date & Time
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <div className="min-w-0">
            <Label className="text-xs text-gray-500 mb-1">Start</Label>
            <Input type="datetime-local" value={form.startDateTime} onChange={e => update("startDateTime", e.target.value)} className="w-full min-w-0" />
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-gray-500 mb-1">End</Label>
            <Input type="datetime-local" value={form.endDateTime} onChange={e => update("endDateTime", e.target.value)} className="w-full min-w-0" />
          </div>
        </div>
      </div>

      {/* Seller Info */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#2C4F4E]">Seller Info (optional)</h3>
        <Input placeholder="Seller name" value={form.sellerName} onChange={e => update("sellerName", e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
          <Input placeholder="Phone" value={form.sellerPhone} onChange={e => update("sellerPhone", e.target.value)} className="min-w-0" />
          <Input placeholder="Email" value={form.sellerEmail} onChange={e => update("sellerEmail", e.target.value)} className="min-w-0" />
        </div>
      </div>

      {/* Admin Notes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#2C4F4E]">Admin Notes (private)</h3>
        <Textarea placeholder="Internal notes about this listing (not shown to seller)" value={form.adminNotes} onChange={e => update("adminNotes", e.target.value)} rows={2} />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        size="lg"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Assisted Listing & Generate QR Code"}
      </Button>
    </div>
  );
}