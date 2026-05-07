import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

export default function PinCheckInFlow({ pin, vendorAccount, existingCheckIn, onClose, onSuccess }) {
  const [latitude, setLatitude] = useState(existingCheckIn?.checkin_latitude || "");
  const [longitude, setLongitude] = useState(existingCheckIn?.checkin_longitude || "");
  const [address, setAddress] = useState(existingCheckIn?.checkin_display_address || "");
  const [durationHours, setDurationHours] = useState(4);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

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

    setSaving(true);
    const now = new Date();
    const endTime = new Date(now.getTime() + Number(durationHours) * 60 * 60 * 1000);
    const data = {
      vendor_pin_id: pin.id,
      vendor_account_id: vendorAccount.id,
      checked_in_by_email: vendorAccount.owner_user_id,
      checkin_latitude: lat,
      checkin_longitude: lng,
      checkin_display_address: address,
      checkin_start_time: now.toISOString(),
      checkin_end_time: endTime.toISOString(),
      status: "live",
      pin_animation: "none",
    };

    if (existingCheckIn?.id) {
      await base44.entities.VendorPinCheckIn.update(existingCheckIn.id, data);
    } else {
      await base44.entities.VendorPinCheckIn.create(data);
    }

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
          <Input type="number" min="1" max="12" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="Hours live" className="rounded-xl" />
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