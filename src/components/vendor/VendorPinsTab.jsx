import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVendorPinLimit, getVendorTierConfig } from "@/lib/vendorTiers";
import { toast } from "sonner";

export default function VendorPinsTab({ account, pins, users, onRefresh, onCheckIn }) {
  const [form, setForm] = useState({ pin_name: "", description: "", pin_logo_url: "", assigned_users: [] });
  const tier = getVendorTierConfig(account?.vendor_tier);
  const canAddPin = pins.length < getVendorPinLimit(account);

  const createPin = async () => {
    if (!form.pin_name.trim()) return;
    if (!canAddPin) {
      toast.error("You reached your pin limit. Upgrade or add extra pins.");
      return;
    }
    await base44.entities.VendorPin.create({ ...form, vendor_account_id: account.id, is_active: true });
    setForm({ pin_name: "", description: "", pin_logo_url: "", assigned_users: [] });
    toast.success("Pin profile created");
    onRefresh();
  };

  const updatePin = async (pin, patch) => {
    await base44.entities.VendorPin.update(pin.id, { ...pin, ...patch });
    onRefresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card><CardHeader><CardTitle>Create Truck Pin</CardTitle></CardHeader><CardContent className="space-y-3">
        <Input placeholder="Pin name" value={form.pin_name} onChange={(e) => setForm({ ...form, pin_name: e.target.value })} />
        <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {tier.logoPin && <Input placeholder="Logo URL" value={form.pin_logo_url} onChange={(e) => setForm({ ...form, pin_logo_url: e.target.value })} />}
        <Button onClick={createPin} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">Create Pin</Button>
        {!canAddPin && <p className="text-sm text-amber-700">Pin limit reached for your tier.</p>}
      </CardContent></Card>

      <div className="grid gap-4 md:grid-cols-2">
        {pins.map((pin) => (
          <Card key={pin.id}>
            <CardHeader><CardTitle className="flex items-center justify-between gap-2"><span>{pin.pin_name}</span><Badge>{pin.is_active ? "Active" : "Inactive"}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pin.pin_logo_url && <img src={pin.pin_logo_url} alt={pin.pin_name} className="h-14 w-14 rounded-lg object-cover border" />}
              <Input value={pin.pin_name || ""} onChange={(e) => updatePin(pin, { pin_name: e.target.value })} />
              <Textarea value={pin.description || ""} onChange={(e) => updatePin(pin, { description: e.target.value })} />
              {tier.logoPin && <Input placeholder="Logo URL" value={pin.pin_logo_url || ""} onChange={(e) => updatePin(pin, { pin_logo_url: e.target.value })} />}
              <Select onValueChange={(email) => updatePin(pin, { assigned_users: Array.from(new Set([...(pin.assigned_users || []), email])) })}>
                <SelectTrigger><SelectValue placeholder="Assign user" /></SelectTrigger>
                <SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.authorized_email}>{user.authorized_email}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1">{(pin.assigned_users || []).map((email) => <Badge key={email} variant="outline">{email}</Badge>)}</div>
              <Button onClick={() => onCheckIn(pin)} className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">Check In This Pin</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}