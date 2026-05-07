import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { canVendorCheckInToday, getVendorTierConfig } from "@/lib/vendorTiers";

export default function PinCheckInFlow({ pin, vendorAccount, currentUser, existingCheckIn, onClose, onSuccess }) {
  const [latitude, setLatitude] = useState(existingCheckIn?.checkin_latitude || "");
  const [longitude, setLongitude] = useState(existingCheckIn?.checkin_longitude || "");
  const [address, setAddress] = useState(existingCheckIn?.checkin_display_address || "");
  const [durationHours, setDurationHours] = useState(4);
  const [pinAnimation, setPinAnimation] = useState(existingCheckIn?.pin_animation || "none");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const tier = getVendorTierConfig(vendorAccount?.vendor_tier);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        toast.error("Unable to get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!lat || !lng) {
      toast.error("Latitude and longitude are required");
      return;
    }

    const existingCheckIns = await base44.entities.VendorPinCheckIn.filter({ vendor_account_id: vendorAccount.id }, "-created_date");
    const result = canVendorCheckInToday(vendorAccount, existingCheckIns);
    if (!existingCheckIn?.id && !result.allowed) {
      toast.error(result.reason);
      return;
    }

    setSaving(true);
    const now = new Date();
    const hours = tier.maxCheckInDurationHours ? Math.min(Number(durationHours), tier.maxCheckInDurationHours) : Number(durationHours);
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const data = {
      vendor_pin_id: pin.id,
      vendor_account_id: vendorAccount.id,
      checked_in_by_email: currentUser?.email || vendorAccount.owner_user_id,
      checkin_latitude: lat,
      checkin_longitude: lng,
      checkin_display_address: address,
      checkin_start_time: now.toISOString(),
      checkin_end_time: endTime.toISOString(),
      status: "live",
      pin_animation: tier.animation ? pinAnimation : "none",
    };

    const savedCheckIn = existingCheckIn?.id
      ? await base44.entities.VendorPinCheckIn.update(existingCheckIn.id, data)
      : await base44.entities.VendorPinCheckIn.create(data);

    await base44.functions.invoke("syncPublicMapRecord", { recordType: "vendor_pin_checkin", recordId: savedCheckIn.id || existingCheckIn.id });

    toast.success("Pin is live");
    setSaving(false);
    onSuccess?.();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Drop Your Pin: {pin?.pin_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button onClick={useCurrentLocation} variant="outline" disabled={locating} className="w-full rounded-xl gap-2">
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Use Current Location
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" className="rounded-xl" />
            <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" className="rounded-xl" />
          </div>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Display address or location note" className="rounded-xl" />
          <Input type="number" min="1" max={tier.maxCheckInDurationHours || 12} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="Hours live" className="rounded-xl" />
          {tier.maxCheckInDurationHours && <p className="text-xs text-slate-500">Free vendor check-ins auto-expire after 4 hours. Upgrade for longer live visibility and unlimited check-ins.</p>}
          {tier.animation && <select value={pinAnimation} onChange={(e) => setPinAnimation(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="none">No animation</option>
            <option value="pulse">Pulse animation</option>
            <option value="bounce">Bounce animation</option>
          </select>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              Go Live
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}