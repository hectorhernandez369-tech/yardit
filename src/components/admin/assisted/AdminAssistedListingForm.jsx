import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Loader2, CheckCircle, Camera, X } from "lucide-react";
import AssistedListingQRPanel from "@/components/admin/assisted/AssistedListingQRPanel";

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

function tryGeocodeAddress(address) {
  return new Promise((resolve) => {
    if (!window.google?.maps) { resolve(null); return; }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
}

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
  sellerPermissionConfirmed: false,
};

export default function AdminAssistedListingForm({ adminUser }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isGeocoding, setIsGeocoding] = useState(false);
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

  const handleGeocode = async () => {
    if (!form.addressText || !form.city || !form.state) {
      toast.error("Enter address, city, and state first");
      return;
    }
    setIsGeocoding(true);
    const fullAddr = `${form.addressText}, ${form.city}, ${form.state} ${form.zip}`;
    const result = await tryGeocodeAddress(fullAddr);
    setIsGeocoding(false);
    if (result) {
      update("lat", String(result.lat));
      update("lng", String(result.lng));
      toast.success("Location pinned");
    } else {
      toast.error("Could not geocode address. Enter lat/lng manually.");
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
    if (!form.sellerPermissionConfirmed) {
      toast.error("You must confirm seller permission before creating the listing.");
      return;
    }
    if (!form.addressText || !form.city || !form.state || !form.zip) {
      toast.error("Complete the address fields.");
      return;
    }
    if (!form.lat || !form.lng) {
      toast.error("Pin the location before creating the listing.");
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

    setIsSubmitting(true);
    try {
      const response = await base44.functions.invoke("createAssistedListing", {
        listingType: form.listingType,
        tier: form.tier,
        addressText: form.addressText,
        city: form.city,
        state: form.state,
        zip: form.zip,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
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
        address: `${form.addressText}, ${form.city}, ${form.state}`,
        title: form.title,
      });
      toast.success("Assisted listing created! Show the QR code to the seller.");
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Failed to create listing");
    }
    setIsSubmitting(false);
  };

  const handleReset = () => {
    setCreated(null);
    setForm({ ...EMPTY_FORM });
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
        <Input placeholder="Street address" value={form.addressText} onChange={e => update("addressText", e.target.value)} />
        <div className="grid grid-cols-3 gap-2 min-w-0">
          <Input placeholder="City" value={form.city} onChange={e => update("city", e.target.value)} className="min-w-0" />
          <Input placeholder="ST" value={form.state} onChange={e => update("state", e.target.value)} maxLength={2} className="min-w-0" />
          <Input placeholder="ZIP" value={form.zip} onChange={e => update("zip", e.target.value)} className="min-w-0" />
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <Input placeholder="Latitude" value={form.lat} onChange={e => update("lat", e.target.value)} className="min-w-0" />
          <Input placeholder="Longitude" value={form.lng} onChange={e => update("lng", e.target.value)} className="min-w-0" />
        </div>
        <Button variant="outline" size="sm" onClick={handleGeocode} disabled={isGeocoding} className="w-full">
          {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          <span className="ml-1">{isGeocoding ? "Pinning..." : "Pin Location from Address"}</span>
        </Button>
        {form.lat && form.lng && (
          <p className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Location pinned: {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}
          </p>
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

      {/* Permission checkbox */}
      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Checkbox
            id="perm"
            checked={form.sellerPermissionConfirmed}
            onCheckedChange={v => update("sellerPermissionConfirmed", v)}
            className="mt-0.5"
          />
          <Label htmlFor="perm" className="text-sm text-red-800 font-medium leading-snug cursor-pointer">
            ✅ I confirm that the seller gave permission to create this promotional listing on their behalf.
          </Label>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !form.sellerPermissionConfirmed}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        size="lg"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Assisted Listing & Generate QR Code"}
      </Button>
    </div>
  );
}