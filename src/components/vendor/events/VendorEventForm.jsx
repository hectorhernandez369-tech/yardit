import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VENDOR_EVENT_TYPES } from "@/lib/vendorEvents";
import { toast } from "sonner";

const initialForm = {
  title: "",
  description: "",
  category: "",
  event_type: "single",
  display_address: "",
  latitude: "",
  longitude: "",
  radius_feet: "500",
  startDateTime: "",
  endDateTime: "",
  open_to_vendors: false,
  vendor_invitation_description: "",
  vendor_fee_type: "none",
  vendor_general_fee: "",
  vendor_space_options_text: "10x10 = 100\n10x20 = 150",
  allow_custom_spaces: false,
  vendor_instructions: "",
  vendor_deadline: "",
  max_vendors: "",
};

function parseSpaceOptions(text) {
  return String(text || "").split("\n").map((line) => {
    const [label, price] = line.split("=").map((item) => item?.trim());
    if (!label) return null;
    return { label, price: Number(price || 0) };
  }).filter(Boolean);
}

export default function VendorEventForm({ account, user, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const createEvent = async (status) => {
    if (!form.title || !form.startDateTime || !form.endDateTime || !form.latitude || !form.longitude) {
      toast.error("Please add a title, schedule, and map coordinates.");
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const event = await base44.entities.VendorEvent.create({
      organizer_user_id: user.id,
      organizer_business_id: account.id,
      organizer_business_name: account.business_name,
      organizer_logo: account.business_logo,
      title: form.title,
      description: form.description,
      category: form.category,
      event_type: form.event_type,
      status,
      display_address: form.display_address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
      radius_feet: Number(form.radius_feet || 0),
      startDateTime: new Date(form.startDateTime).toISOString(),
      endDateTime: new Date(form.endDateTime).toISOString(),
      open_to_vendors: form.open_to_vendors,
      vendor_invitation_description: form.vendor_invitation_description,
      vendor_fee_type: form.open_to_vendors ? form.vendor_fee_type : "none",
      vendor_general_fee: form.vendor_fee_type === "general_fee" ? Number(form.vendor_general_fee || 0) : 0,
      vendor_space_options: form.vendor_fee_type === "set_space_fee" ? parseSpaceOptions(form.vendor_space_options_text) : [],
      allow_custom_spaces: form.allow_custom_spaces,
      vendor_instructions: form.vendor_instructions,
      vendor_deadline: form.vendor_deadline,
      max_vendors: form.max_vendors ? Number(form.max_vendors) : null,
      photos: [],
      created_at: now,
      updated_at: now,
    });

    if (form.event_type === "multi_location") {
      const code = `VE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await base44.entities.EventInviteCode.create({
        event_id: event.id,
        invite_code: code,
        invite_link: `${window.location.origin}/VendorEventDetail?id=${event.id}&invite=${code}`,
        auto_approve: true,
        created_at: now,
      });
    }

    setForm(initialForm);
    setSaving(false);
    toast.success(status === "published" ? "Event published" : "Event saved as draft");
    onCreated?.(event);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Event name" value={form.title} onChange={(e) => update("title", e.target.value)} />
        <Input placeholder="Category" value={form.category} onChange={(e) => update("category", e.target.value)} />
        <Select value={form.event_type} onValueChange={(value) => update("event_type", value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{VENDOR_EVENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Display address" value={form.display_address} onChange={(e) => update("display_address", e.target.value)} />
        <Input type="number" placeholder="Latitude" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} />
        <Input type="number" placeholder="Longitude" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} />
        {form.event_type === "multi_spot" && <Input type="number" placeholder="Radius in feet" value={form.radius_feet} onChange={(e) => update("radius_feet", e.target.value)} />}
        <Input type="datetime-local" value={form.startDateTime} onChange={(e) => update("startDateTime", e.target.value)} />
        <Input type="datetime-local" value={form.endDateTime} onChange={(e) => update("endDateTime", e.target.value)} />
      </div>

      <Textarea placeholder="Event description" value={form.description} onChange={(e) => update("description", e.target.value)} />

      <div className="rounded-2xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-bold text-[#2C4F4E]">
          <input type="checkbox" checked={form.open_to_vendors} onChange={(e) => update("open_to_vendors", e.target.checked)} />
          Open to vendors
        </label>

        {form.open_to_vendors && (
          <div className="space-y-3">
            <Textarea placeholder="Vendor invitation description" value={form.vendor_invitation_description} onChange={(e) => update("vendor_invitation_description", e.target.value)} />
            <Select value={form.vendor_fee_type} onValueChange={(value) => update("vendor_fee_type", value)}>
              <SelectTrigger><SelectValue placeholder="Attendance cost type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No fee</SelectItem>
                <SelectItem value="general_fee">General fee</SelectItem>
                <SelectItem value="set_space_fee">Set space fee</SelectItem>
              </SelectContent>
            </Select>
            {form.vendor_fee_type === "general_fee" && <Input type="number" placeholder="Fee amount" value={form.vendor_general_fee} onChange={(e) => update("vendor_general_fee", e.target.value)} />}
            {form.vendor_fee_type === "set_space_fee" && (
              <div className="space-y-2">
                <Label>Space options, one per line</Label>
                <Textarea value={form.vendor_space_options_text} onChange={(e) => update("vendor_space_options_text", e.target.value)} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_custom_spaces} onChange={(e) => update("allow_custom_spaces", e.target.checked)} />Allow custom spaces</label>
              </div>
            )}
            <Textarea placeholder="Vendor instructions" value={form.vendor_instructions} onChange={(e) => update("vendor_instructions", e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="date" value={form.vendor_deadline} onChange={(e) => update("vendor_deadline", e.target.value)} />
              <Input type="number" placeholder="Optional max vendors" value={form.max_vendors} onChange={(e) => update("max_vendors", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} onClick={() => createEvent("draft")}>Save Draft</Button>
        <Button disabled={saving} onClick={() => createEvent("published")} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Publish Event</Button>
      </div>
    </div>
  );
}