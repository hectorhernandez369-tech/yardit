import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VENDOR_EVENT_TYPES } from "@/lib/vendorEvents";
import EventLocationPicker from "./EventLocationPicker";
import InviteVendorsModal from "./InviteVendorsModal";
import { toast } from "sonner";

const initialForm = {
  title: "",
  description: "",
  category: "",
  event_type: "single",
  display_address: "",
  geocoded_address: "",
  latitude: "",
  longitude: "",
  radius_feet: "500",
  startDateTime: "",
  endDateTime: "",
  open_to_vendors: false,
  vendor_invitation_description: "",
  vendor_fee_type: "set_space_fee",
  vendor_payment_type: "reserve_deposit",
  reserve_deposit_percentage: "20",
  vendor_general_fee: "",
  vendor_space_options: [],
  allow_custom_spaces: false,
  vendor_instructions: "",
  vendor_deadline: "",
  max_vendors: "",
  status: "draft",
};

const toLocalDateTimeValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const buildInitialForm = (event) => event ? {
  ...initialForm,
  title: event.title || "",
  description: event.description || "",
  category: event.category || "",
  event_type: event.event_type || "single",
  display_address: event.display_address || "",
  geocoded_address: event.geocoded_address || event.display_address || "",
  latitude: event.latitude || "",
  longitude: event.longitude || "",
  radius_feet: String(event.radius_feet || 500),
  startDateTime: toLocalDateTimeValue(event.startDateTime),
  endDateTime: toLocalDateTimeValue(event.endDateTime),
  open_to_vendors: !!event.open_to_vendors,
  vendor_invitation_description: event.vendor_invitation_description || "",
  vendor_fee_type: event.vendor_fee_type && event.vendor_fee_type !== "none" ? event.vendor_fee_type : "set_space_fee",
  vendor_payment_type: event.vendor_payment_type || "reserve_deposit",
  reserve_deposit_percentage: event.reserve_deposit_percentage || "20",
  vendor_general_fee: event.vendor_general_fee || "",
  vendor_space_options: event.vendor_space_options || [],
  allow_custom_spaces: !!event.allow_custom_spaces,
  vendor_instructions: event.vendor_instructions || "",
  vendor_deadline: event.vendor_deadline || "",
  max_vendors: event.max_vendors || "",
  status: event.status || "draft",
} : initialForm;

export default function VendorEventForm({ account, user, event = null, approvedVendorCount = 0, onCreated }) {
  const isEditing = !!event?.id;
  const datesLocked = isEditing && approvedVendorCount > 0;
  const [form, setForm] = useState(buildInitialForm(event));
  const [saving, setSaving] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [showInviteVendors, setShowInviteVendors] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const addSpaceOption = () => update("vendor_space_options", [...form.vendor_space_options, { label: "", width: "", depth: "", price: "", quantity: "" }]);
  const updateSpaceOption = (index, key, value) => update("vendor_space_options", form.vendor_space_options.map((option, optionIndex) => optionIndex === index ? { ...option, [key]: value } : option));
  const removeSpaceOption = (index) => update("vendor_space_options", form.vendor_space_options.filter((_, optionIndex) => optionIndex !== index));
  const formatMoney = (value) => `$${Number(value || 0).toFixed(0)}`;
  const previewSpace = form.vendor_space_options.find((option) => Number(option.price) > 0);
  const previewPrice = Number(previewSpace?.price || 0);
  const reservePercent = Number(form.reserve_deposit_percentage || 20);
  const reserveDue = previewPrice * (reservePercent / 100);
  const splitAmount = reserveDue / 2;
  const remainingBalance = Math.max(previewPrice - reserveDue, 0);

  const saveEvent = async (status) => {
    if (!form.title || !form.startDateTime || !form.endDateTime || !form.latitude || !form.longitude) {
      toast.error("Please add a title, schedule, and event location.");
      return;
    }

    if (form.open_to_vendors && (!form.max_vendors || Number(form.max_vendors) <= 0)) {
      toast.error("Please add max vendors before opening this event to vendors.");
      return;
    }

    if (form.open_to_vendors && form.vendor_fee_type === "none") {
      toast.error("Please choose a vendor fee setup.");
      return;
    }

    if (form.open_to_vendors && form.vendor_fee_type === "set_space_fee" && form.vendor_space_options.length === 0) {
      toast.error("Please add at least one space option.");
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const eventData = {
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
      geocoded_address: form.geocoded_address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
      radius_feet: Number(form.radius_feet || 0),
      startDateTime: datesLocked ? event.startDateTime : new Date(form.startDateTime).toISOString(),
      endDateTime: datesLocked ? event.endDateTime : new Date(form.endDateTime).toISOString(),
      open_to_vendors: form.open_to_vendors,
      vendor_invitation_description: form.vendor_invitation_description,
      vendor_fee_type: form.open_to_vendors ? "set_space_fee" : "none",
      vendor_payment_type: form.open_to_vendors ? form.vendor_payment_type : "no_online_payment",
      reserve_deposit_percentage: form.open_to_vendors ? Number(form.reserve_deposit_percentage || 20) : null,
      vendor_general_fee: form.vendor_fee_type === "general_fee" ? Number(form.vendor_general_fee || 0) : 0,
      vendor_space_options: form.vendor_fee_type === "set_space_fee" ? form.vendor_space_options.map((option) => ({ label: option.label, width: Number(option.width || 0), depth: Number(option.depth || 0), price: Number(option.price || 0), quantity: option.quantity ? Number(option.quantity) : null })) : [],
      allow_custom_spaces: form.allow_custom_spaces,
      vendor_instructions: form.vendor_instructions,
      vendor_deadline: form.vendor_deadline,
      max_vendors: form.max_vendors ? Number(form.max_vendors) : null,
      photos: event?.photos || [],
      updated_at: now,
    };

    const savedEvent = isEditing
      ? await base44.entities.VendorEvent.update(event.id, eventData)
      : await base44.entities.VendorEvent.create({ ...eventData, created_at: now });

    if (!isEditing && form.event_type === "multi_location") {
      const code = `VE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await base44.entities.EventInviteCode.create({
        event_id: savedEvent.id,
        invite_code: code,
        invite_link: `${window.location.origin}/VendorEventDetail?id=${savedEvent.id}&invite=${code}`,
        auto_approve: true,
        created_at: now,
      });
    }

    setCreatedEvent(savedEvent);
    if (!isEditing) setForm(initialForm);
    setSaving(false);
    toast.success(isEditing ? "Event details updated" : status === "published" ? "Event published" : "Event saved as draft");
    onCreated?.(savedEvent);
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
        <div className="sm:col-span-2 rounded-xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#2C4F4E]">Event location</p>
            <p className="text-sm text-slate-600">{form.display_address || "No location selected yet"}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setShowLocationPicker(true)}>Choose Event Location</Button>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-bold text-[#2C4F4E]">Start date & time</Label>
          <Input type="datetime-local" value={form.startDateTime} disabled={datesLocked} onChange={(e) => update("startDateTime", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-bold text-[#2C4F4E]">End date & time</Label>
          <Input type="datetime-local" value={form.endDateTime} disabled={datesLocked} onChange={(e) => update("endDateTime", e.target.value)} />
          {datesLocked && <p className="text-xs text-amber-700">Dates cannot be changed once at least one vendor is approved.</p>}
        </div>
      </div>

      <Textarea placeholder="Event description" value={form.description} onChange={(e) => update("description", e.target.value)} />

      <div className="rounded-2xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-bold text-[#2C4F4E]">
          <input type="checkbox" checked={form.open_to_vendors} onChange={(e) => update("open_to_vendors", e.target.checked)} />
          Open to vendors
        </label>

        {form.open_to_vendors && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <div>
                <h3 className="font-black text-[#2C4F4E]">Vendor Invitation Info</h3>
                <p className="text-xs text-slate-500">Tell vendors what to expect before they request or reserve a spot.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#2C4F4E]">Vendor Invitation Description</Label>
                <Textarea placeholder="Describe why vendors should join this event" value={form.vendor_invitation_description} onChange={(e) => update("vendor_invitation_description", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#2C4F4E]">Vendor Instructions</Label>
                <Textarea placeholder="Setup instructions, arrival details, power access, parking, or other notes" value={form.vendor_instructions} onChange={(e) => update("vendor_instructions", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#2C4F4E]">Vendor Signup Deadline</Label>
                <Input type="date" value={form.vendor_deadline} onChange={(e) => update("vendor_deadline", e.target.value)} />
                <p className="text-xs text-slate-500">Last day vendors can reserve or request to join this event.</p>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 space-y-3">
              <div>
                <h3 className="font-black text-[#2C4F4E]">Space Options</h3>
                <p className="text-xs text-slate-500">Create the space types vendors can reserve.</p>
              </div>
              {form.vendor_space_options.map((option, index) => (
                <div key={index} className="rounded-xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs font-bold text-[#2C4F4E]">Space Type / Name</Label>
                      <Input placeholder="Non-food Vendor, Food Truck, 10x10 Booth" value={option.label} onChange={(e) => updateSpaceOption(index, "label", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-[#2C4F4E]">Width (feet)</Label>
                      <Input type="number" placeholder="10" value={option.width} onChange={(e) => updateSpaceOption(index, "width", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-[#2C4F4E]">Depth (feet)</Label>
                      <Input type="number" placeholder="10" value={option.depth} onChange={(e) => updateSpaceOption(index, "depth", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-[#2C4F4E]">Price</Label>
                      <Input type="number" placeholder="150" value={option.price} onChange={(e) => updateSpaceOption(index, "price", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-[#2C4F4E]">Quantity Available</Label>
                      <Input type="number" placeholder="5" value={option.quantity} onChange={(e) => updateSpaceOption(index, "quantity", e.target.value)} />
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSpaceOption(index)}>Remove Space Option</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addSpaceOption}>Add Space Option</Button>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input className="mt-1" type="checkbox" checked={form.allow_custom_spaces} onChange={(e) => update("allow_custom_spaces", e.target.checked)} />
                <span><strong>Allow custom spaces</strong><br /><span className="text-xs text-slate-500">Let vendors request a space size that is not listed above.</span></span>
              </label>
            </div>

            <div className="rounded-xl border bg-white p-4 space-y-3">
              <div>
                <h3 className="font-black text-[#2C4F4E]">Vendor Capacity</h3>
                <p className="text-xs text-slate-500">This controls how many vendors can reserve or request to join this event.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#2C4F4E]">Maximum Vendors Allowed</Label>
                <Input type="number" placeholder="10" value={form.max_vendors} onChange={(e) => update("max_vendors", e.target.value)} />
                {form.max_vendors && <p className="text-xs text-slate-600">{form.max_vendors} maximum vendors</p>}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 space-y-3">
              <div>
                <h3 className="font-black text-[#2C4F4E]">Reserve Payment</h3>
                <p className="text-xs text-slate-500">Set how vendors reserve their spot online.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-[#2C4F4E]">Vendor Payment Type</Label>
                  <Select value={form.vendor_payment_type} onValueChange={(value) => update("vendor_payment_type", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reserve_deposit">Reserve Deposit</SelectItem>
                      <SelectItem value="pay_full_amount">Pay Full Amount</SelectItem>
                      <SelectItem value="no_online_payment">No Online Payment Yet</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">Choose how vendors will pay when reserving a space.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-[#2C4F4E]">Reserve Deposit Percentage</Label>
                  <Input type="number" placeholder="20" value={form.reserve_deposit_percentage} onChange={(e) => update("reserve_deposit_percentage", e.target.value)} />
                  <p className="text-xs text-slate-500">Vendors pay this percentage to reserve their spot. Yardit and the event organizer split this reserve payment.</p>
                </div>
              </div>
              <div className="rounded-xl bg-[#FBFAF7] p-3 text-sm text-slate-700 space-y-1">
                <p className="font-bold text-[#2C4F4E]">Split Preview{previewSpace?.label ? ` for ${previewSpace.label}` : ""}</p>
                {previewPrice > 0 ? (
                  <>
                    <p>Reserve due today: {formatMoney(reserveDue)}</p>
                    <p>Organizer receives now: {formatMoney(splitAmount)}</p>
                    <p>Platform reservation fee: {formatMoney(splitAmount)}</p>
                    <p>Remaining balance paid to organizer later: {formatMoney(remainingBalance)}</p>
                  </>
                ) : (
                  <p>Add a space option price to preview the reserve payment split.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {!isEditing && <Button variant="outline" disabled={saving} onClick={() => saveEvent("draft")}>Save Draft</Button>}
        <Button variant="outline" disabled={!createdEvent && !isEditing} onClick={() => setShowInviteVendors(true)}>Invite Vendors</Button>
        <Button disabled={saving} onClick={() => saveEvent(isEditing ? form.status || event.status : "published")} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">{isEditing ? "Save Changes" : "Publish Event"}</Button>
      </div>

      <EventLocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        eventType={form.event_type}
        value={form.latitude && form.longitude ? { latitude: Number(form.latitude), longitude: Number(form.longitude), display_address: form.display_address, geocoded_address: form.geocoded_address, radius_feet: Number(form.radius_feet || 500) } : null}
        onChange={(location) => setForm((prev) => ({ ...prev, display_address: location.display_address, geocoded_address: location.geocoded_address, latitude: location.latitude, longitude: location.longitude, radius_feet: String(location.radius_feet || 500) }))}
      />

      {createdEvent && (
        <InviteVendorsModal
          open={showInviteVendors}
          onOpenChange={setShowInviteVendors}
          event={createdEvent || event}
          organizerUserId={user.id}
          approvedCount={0}
        />
      )}
    </div>
  );
}