import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CalendarClock, MapPin, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-200 text-slate-600",
  canceled: "bg-red-100 text-red-700",
};

export default function VendorPinScheduleDrawer({ open, onOpenChange, pin, user, onSaved }) {
  const [form, setForm] = useState({
    scheduled_date: pin?.scheduled_date || "",
    scheduled_start_time: pin?.scheduled_start_time || "",
    scheduled_end_time: pin?.scheduled_end_time || "",
    scheduled_location_label: pin?.scheduled_location_label || "",
    scheduled_lat: pin?.scheduled_lat || "",
    scheduled_lng: pin?.scheduled_lng || "",
    schedule_status: pin?.schedule_status || "draft",
    schedule_notes: pin?.schedule_notes || "",
  });
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.scheduled_date || !form.scheduled_start_time || !form.scheduled_end_time) {
      toast.error("Date, start time, and end time are required.");
      return;
    }
    setSaving(true);
    await base44.entities.VendorPin.update(pin.id, {
      scheduled_date: form.scheduled_date,
      scheduled_start_time: form.scheduled_start_time,
      scheduled_end_time: form.scheduled_end_time,
      scheduled_location_label: form.scheduled_location_label,
      scheduled_lat: form.scheduled_lat ? Number(form.scheduled_lat) : null,
      scheduled_lng: form.scheduled_lng ? Number(form.scheduled_lng) : null,
      schedule_status: form.schedule_status,
      schedule_notes: form.schedule_notes,
      scheduled_by_user_id: user?.id || "",
      scheduled_by_name: user?.full_name || user?.email || "",
    });
    setSaving(false);
    toast.success("Schedule saved.");
    onSaved?.();
    onOpenChange(false);
  };

  const handleClear = async () => {
    setSaving(true);
    await base44.entities.VendorPin.update(pin.id, {
      scheduled_date: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
      scheduled_location_label: null,
      scheduled_lat: null,
      scheduled_lng: null,
      schedule_status: "draft",
      schedule_notes: null,
      scheduled_by_user_id: null,
      scheduled_by_name: null,
    });
    setSaving(false);
    toast.success("Schedule cleared.");
    onSaved?.();
    onOpenChange(false);
  };

  const hasExistingSchedule = pin?.scheduled_date || pin?.schedule_status === "scheduled";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-[#2C4F4E]">
            <CalendarClock className="h-5 w-5" />
            Schedule — {pin?.pin_name}
          </SheetTitle>
          <SheetDescription>
            Plan when and where this pin will be live. Scheduling does not check you in or make the pin public — you must still manually check in within the required radius when it's time.
          </SheetDescription>
        </SheetHeader>

        {/* Important notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-5 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Scheduling is preparation only</p>
            <p>Your pin will only go public after you manually check in <strong>on the scheduled date</strong>, within the required GPS radius. Being outside the radius keeps the pin private.</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Schedule Status</Label>
            {form.schedule_status && (
              <Badge className={STATUS_COLORS[form.schedule_status]}>
                {form.schedule_status.charAt(0).toUpperCase() + form.schedule_status.slice(1)}
              </Badge>
            )}
          </div>
          <Select value={form.schedule_status} onValueChange={(v) => update("schedule_status", v)}>
            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>

          {/* Date */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Scheduled Date *</Label>
            <Input type="date" value={form.scheduled_date} onChange={(e) => update("scheduled_date", e.target.value)} className="bg-white" />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Start Time *</Label>
              <Input type="time" value={form.scheduled_start_time} onChange={(e) => update("scheduled_start_time", e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">End Time *</Label>
              <Input type="time" value={form.scheduled_end_time} onChange={(e) => update("scheduled_end_time", e.target.value)} className="bg-white" />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide flex items-center gap-1"><MapPin className="h-3 w-3" /> Location Label</Label>
            <Input placeholder="e.g. Downtown Farmers Market, Main St & 5th Ave" value={form.scheduled_location_label} onChange={(e) => update("scheduled_location_label", e.target.value)} className="bg-white" />
            <p className="text-xs text-slate-400">Visible to authorized users of this truck only.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Lat (optional)</Label>
              <Input type="number" step="any" placeholder="37.7749" value={form.scheduled_lat} onChange={(e) => update("scheduled_lat", e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Lng (optional)</Label>
              <Input type="number" step="any" placeholder="-122.4194" value={form.scheduled_lng} onChange={(e) => update("scheduled_lng", e.target.value)} className="bg-white" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Internal Notes</Label>
            <Textarea placeholder="Parking notes, equipment checklist, reminders..." value={form.schedule_notes} onChange={(e) => update("schedule_notes", e.target.value)} className="bg-white resize-none h-20" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#5DADA5] hover:bg-[#4A9B93]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Schedule"}
            </Button>
            {hasExistingSchedule && (
              <Button onClick={handleClear} disabled={saving} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                Clear
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}