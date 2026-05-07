import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canVendorCheckInToday, getVendorTierConfig } from "@/lib/vendorTiers";
import { toast } from "sonner";

export default function VendorCheckInDialog({ open, onOpenChange, account, pin, user, checkIns, onRefresh }) {
  const [form, setForm] = useState({ latitude: "", longitude: "", address: "", hours: "4", pin_animation: "none" });
  const tier = getVendorTierConfig(account?.vendor_tier);

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      setForm((prev) => ({ ...prev, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }));
      toast.success("Location added");
    });
  };

  const createCheckIn = async () => {
    if (!pin) return;
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("Add a valid latitude and longitude.");
      return;
    }

    const result = canVendorCheckInToday(account, checkIns.filter((item) => item.vendor_account_id === account.id));
    if (!result.allowed) {
      toast.error(result.reason);
      return;
    }

    const hours = tier.maxCheckInDurationHours ? Math.min(Number(form.hours || 4), tier.maxCheckInDurationHours) : Number(form.hours || 4);
    const start = new Date();
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    await base44.entities.VendorPinCheckIn.create({
      vendor_pin_id: pin.id,
      vendor_account_id: account.id,
      checked_in_by_email: user?.email || "",
      checkin_latitude: lat,
      checkin_longitude: lng,
      checkin_display_address: form.address,
      checkin_start_time: start.toISOString(),
      checkin_end_time: end.toISOString(),
      pin_animation: tier.animation ? form.pin_animation : "none",
      status: "live",
    });
    toast.success("Pin checked in");
    onOpenChange(false);
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Check In {pin?.pin_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" onClick={useCurrentLocation}>Use Current Location</Button>
          <div className="grid grid-cols-2 gap-3"><Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /><Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
          <Input placeholder="Display address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div><Label>Duration</Label><Select value={form.hours} onValueChange={(value) => setForm({ ...form, hours: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2">2 hours</SelectItem><SelectItem value="4">4 hours</SelectItem>{!tier.maxCheckInDurationHours && <><SelectItem value="8">8 hours</SelectItem><SelectItem value="12">12 hours</SelectItem></>}</SelectContent></Select>{tier.maxCheckInDurationHours && <p className="mt-1 text-xs text-slate-500">Free vendor check-ins auto-expire after 4 hours. Upgrade for longer live visibility.</p>}</div>
          {tier.animation && <div><Label>Animation</Label><Select value={form.pin_animation} onValueChange={(value) => setForm({ ...form, pin_animation: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="pulse">Pulse</SelectItem><SelectItem value="bounce">Bounce</SelectItem></SelectContent></Select></div>}
          <Button onClick={createCheckIn} className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">Start Live Check-In</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}