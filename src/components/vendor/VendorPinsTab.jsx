import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVendorPinLimit, getVendorTierConfig } from "@/lib/vendorTiers";
import { CalendarClock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import VendorPinScheduleDrawer from "./VendorPinScheduleDrawer";
import { formatRecurringScheduleSummary } from "@/lib/vendorPinSchedule";

const SCHEDULE_STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-200 text-slate-600",
  canceled: "bg-red-100 text-red-700",
};

export default function VendorPinsTab({ account, pins, users, user, onRefresh, onCheckIn }) {
  const [form, setForm] = useState({ pin_name: "", description: "", pin_logo_url: "", assigned_users: [] });
  const [schedulingPin, setSchedulingPin] = useState(null);
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
      <Card>
        <CardHeader><CardTitle>Create Truck Pin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Pin name" value={form.pin_name} onChange={(e) => setForm({ ...form, pin_name: e.target.value })} />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {tier.logoPin && <Input placeholder="Logo URL" value={form.pin_logo_url} onChange={(e) => setForm({ ...form, pin_logo_url: e.target.value })} />}
          <Button onClick={createPin} className="w-full bg-[#5DADA5] hover:bg-[#4A9B93]">Create Pin</Button>
          {!canAddPin && <p className="text-sm text-amber-700">Pin limit reached for your tier.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {pins.map((pin) => (
          <Card key={pin.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{pin.pin_name}</span>
                <Badge>{pin.is_active ? "Active" : "Inactive"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pin.pin_logo_url && <img src={pin.pin_logo_url} alt={pin.pin_name} className="h-14 w-14 rounded-lg object-cover border" />}
              <Input value={pin.pin_name || ""} onChange={(e) => updatePin(pin, { pin_name: e.target.value })} />
              <Textarea value={pin.description || ""} onChange={(e) => updatePin(pin, { description: e.target.value })} />
              {tier.logoPin && <Input placeholder="Logo URL" value={pin.pin_logo_url || ""} onChange={(e) => updatePin(pin, { pin_logo_url: e.target.value })} />}
              <Select onValueChange={(email) => updatePin(pin, { assigned_users: Array.from(new Set([...(pin.assigned_users || []), email])) })}>
                <SelectTrigger><SelectValue placeholder="Assign user" /></SelectTrigger>
                <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.authorized_email}>{u.authorized_email}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1">{(pin.assigned_users || []).map((email) => <Badge key={email} variant="outline">{email}</Badge>)}</div>

              {/* Schedule Summary */}
              {(pin.scheduled_date || formatRecurringScheduleSummary(pin.recurring_schedule)) && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-800 flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Schedule</p>
                    <Badge className={SCHEDULE_STATUS_COLORS[pin.schedule_status] || "bg-slate-100 text-slate-600"}>
                      {pin.schedule_status || "draft"}
                    </Badge>
                  </div>
                  {pin.scheduled_date && (
                    <p className="text-xs text-blue-700">
                      One-time: {format(new Date(pin.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
                      {pin.scheduled_start_time && ` · ${pin.scheduled_start_time}`}
                      {pin.scheduled_end_time && ` – ${pin.scheduled_end_time}`}
                    </p>
                  )}
                  {formatRecurringScheduleSummary(pin.recurring_schedule) && (
                    <p className="text-xs text-blue-700">Recurring: {formatRecurringScheduleSummary(pin.recurring_schedule)}</p>
                  )}
                  {pin.scheduled_location_label && (
                    <p className="text-xs text-blue-600 flex items-center gap-1"><MapPin className="h-3 w-3" />{pin.scheduled_location_label}</p>
                  )}
                  <p className="text-[10px] text-blue-500 italic">Pin appears during scheduled windows when location coordinates are set</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => onCheckIn(pin)} className="flex-1 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] text-sm">
                  Check In
                </Button>
                <Button variant="outline" onClick={() => setSchedulingPin(pin)} className="flex-1 text-sm border-[#5DADA5] text-[#5DADA5] hover:bg-[#5DADA5]/5">
                  <CalendarClock className="h-4 w-4 mr-1" /> Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schedulingPin && (
        <VendorPinScheduleDrawer
          open={!!schedulingPin}
          onOpenChange={(open) => !open && setSchedulingPin(null)}
          pin={schedulingPin}
          user={user}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}