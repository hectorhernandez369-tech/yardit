import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VENDOR_EVENT_TYPES, getVendorEventPermission } from "@/lib/vendorEvents";
import EventLocationPicker from "./EventLocationPicker";
import InviteVendorsModal from "./InviteVendorsModal";
import CollapsiblePanel from "./CollapsiblePanel";
import CreateEventCollaboratorsSection from "./CreateEventCollaboratorsSection";
import EventPromotionSection from "./EventPromotionSection";
import DefaultEventLogoPicker from "./DefaultEventLogoPicker";
import { getRolePermissions } from "@/lib/eventCollaboration";
import { isEligibleEventOrganizer } from "@/lib/vendorAccountIdentity";
import { getPromotionRule, calcPromotionUpgrade, getPromotionDates } from "@/lib/vendorEventPromotion";
import { differenceInDays } from "date-fns";
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
  logo: "",
  flyer_url: "",
  public_contact_visibility: "inherit",
  event_flags: [],
  status: "draft",
  coming_soon_start_date: "",
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
  logo: event.logo || "",
  flyer_url: event.flyer_url || "",
  public_contact_visibility: event.public_contact_visibility || "inherit",
  event_flags: [],
  status: event.status || "draft",
  coming_soon_start_date: event.coming_soon_start_date || "",
} : initialForm;

export default function VendorEventForm({ account, user, event = null, approvedVendorCount = 0, mode = "full", existingEvents = [], onCreated, preserveOwner = false }) {
  const isEditing = !!event?.id;
  const showPublicFields = mode !== "vendor";
  const showVendorFields = mode !== "public";
  const datesLocked = isEditing && approvedVendorCount > 0;
  const [form, setForm] = useState(() => buildInitialForm(event));
  const [saving, setSaving] = useState(false);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [showInviteVendors, setShowInviteVendors] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [collaboratorInvitations, setCollaboratorInvitations] = useState([]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const createCollaboratorInvitations = async (savedEvent, now) => {
    if (isEditing || collaboratorInvitations.length === 0) return;

    await Promise.all(collaboratorInvitations.map(async (invite) => {
      const collaborator = await base44.entities.EventCollaborator.create({
        event_id: savedEvent.id,
        organization_id: invite.organization_id,
        organization_name: invite.organization_name,
        role: invite.role,
        permissions: getRolePermissions(invite.role),
        invited_by_user_id: user.id,
        invited_at: now,
        status: "pending",
        is_primary_owner: false,
      });

      await base44.entities.Notification.create({
        userId: invite.organization_owner_user_id,
        user_id: invite.organization_owner_user_id,
        user_email: invite.organization_email,
        title: "Event Collaboration Invitation",
        message: `${account.business_name || "An organizer"} invited ${invite.organization_name} to collaborate on ${savedEvent.title}.`,
        type: "event_collaboration_invite",
        related_entity_type: "VendorEvent",
        related_entity_id: savedEvent.id,
        metadata: { event_id: savedEvent.id, collaborator_id: collaborator.id, organization_id: invite.organization_id, role: invite.role },
        read: false,
        is_read: false,
      });
    }));
  };

  const syncFlagsToEvent = async (eventId, flags) => {
    const existingSpots = await base44.entities.EventSpot.filter({ event_id: eventId });
    const keepIds = flags.filter((flag) => flag.id).map((flag) => flag.id);

    await Promise.all(existingSpots
      .filter((spot) => spot.title?.startsWith("Field ") && !keepIds.includes(spot.id))
      .map((spot) => base44.entities.EventSpot.delete(spot.id)));

    await Promise.all(flags.map((flag, index) => {
      const data = {
        event_id: eventId,
        title: flag.title || flag.label || `Field ${index + 1}`,
        label: flag.label || flag.title || `Field ${index + 1}`,
        icon_key: flag.icon_key || "flag",
        schedule_entries: flag.schedule_entries || [],
        latitude: Number(flag.latitude),
        longitude: Number(flag.longitude),
        display_order: index,
        updated_at: new Date().toISOString(),
      };

      return flag.id
        ? base44.entities.EventSpot.update(flag.id, data)
        : base44.entities.EventSpot.create({ ...data, created_at: new Date().toISOString() });
    }));
  };

  const openLocationPicker = async () => {
    if (isEditing) {
      const spots = await base44.entities.EventSpot.filter({ event_id: event.id }, "display_order");
      setForm((prev) => ({
        ...prev,
        event_flags: spots.map((spot, index) => ({
          id: spot.id,
          temp_id: spot.id,
          event_id: event.id,
          label: spot.label || spot.title || `Field ${index + 1}`,
          title: spot.title || spot.label || `Field ${index + 1}`,
          icon_key: spot.icon_key || "flag",
          schedule_entries: spot.schedule_entries || [],
          latitude: spot.latitude,
          longitude: spot.longitude,
          display_order: spot.display_order ?? index,
        })),
      }));
    }
    setShowLocationPicker(true);
  };

  const uploadFlyer = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFlyer(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("flyer_url", file_url);
    setUploadingFlyer(false);
    event.target.value = "";
  };

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("logo", file_url);
    setUploadingLogo(false);
    event.target.value = "";
  };
  const addSpaceOption = () => update("vendor_space_options", [...form.vendor_space_options, { label: "", width: "", depth: "", price: "", quantity: "" }]);
  const updateSpaceOption = (index, key, value) => update("vendor_space_options", form.vendor_space_options.map((option, optionIndex) => optionIndex === index ? { ...option, [key]: value } : option));
  const removeSpaceOption = (index) => update("vendor_space_options", form.vendor_space_options.filter((_, optionIndex) => optionIndex !== index));
  // Compute whether a promotion upgrade is currently required (for UI blocking)
  const promotionUpgradeRequired = useMemo(() => {
    if (!form.coming_soon_start_date || !form.startDateTime) return false;
    const tierKey = account?.vendor_tier || "free";
    const rule = getPromotionRule(tierKey);
    if (rule.maxDays === 0) return false;
    const resolvedStart = datesLocked && event ? event.startDateTime : new Date(form.startDateTime).toISOString();
    const { rawIncludedDate } = getPromotionDates(resolvedStart, tierKey);
    const { upgradeRequired } = calcPromotionUpgrade(form.coming_soon_start_date, rawIncludedDate);
    return upgradeRequired;
  }, [form.coming_soon_start_date, form.startDateTime, account?.vendor_tier, datesLocked, event]);

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

    if (showVendorFields && form.open_to_vendors && (!form.max_vendors || Number(form.max_vendors) <= 0)) {
      toast.error("Please add max vendors before opening this event to vendors.");
      return;
    }

    if (showVendorFields && form.open_to_vendors && form.vendor_fee_type === "none") {
      toast.error("Please choose a vendor fee setup.");
      return;
    }

    if (showVendorFields && form.open_to_vendors && form.vendor_fee_type === "set_space_fee" && form.vendor_space_options.length === 0) {
      toast.error("Please add at least one space option.");
      return;
    }

    const eventPermission = getVendorEventPermission({
      account,
      events: existingEvents,
      eventType: form.event_type,
      startDateTime: form.startDateTime,
      excludeEventId: event?.id || null,
    });

    if (!eventPermission.allowed && (!isEditing || form.event_type !== event.event_type || form.startDateTime !== toLocalDateTimeValue(event.startDateTime))) {
      toast.error(eventPermission.reason);
      return;
    }

    if (!isEditing && !isEligibleEventOrganizer(account)) {
      toast.error("Only active Event Organizer accounts can create vendor events.");
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    // --- Promotion fields ---
    const tierKey = account?.vendor_tier || "free";
    const rule = getPromotionRule(tierKey);
    const resolvedStart = datesLocked ? event.startDateTime : new Date(form.startDateTime).toISOString();

    // If no date was explicitly chosen but tier includes promotion, default to the included date.
    let effectiveComingSoonDate = form.coming_soon_start_date;
    if (!effectiveComingSoonDate && rule.includedDays > 0 && resolvedStart) {
      const { defaultComingSoonDate: defDate, eventStartsToday } = getPromotionDates(resolvedStart, tierKey);
      if (!eventStartsToday) effectiveComingSoonDate = defDate.toISOString();
    }

    let promotionFields = {
      promotion_included_days: rule.includedDays,
      promotion_max_days: rule.maxDays,
      coming_soon_start_date: null,
      promotion_selected_days: 0,
      promotion_upgrade_days: 0,
      promotion_upgrade_required: false,
      promotion_status: "none",
    };

    if (effectiveComingSoonDate && rule.maxDays > 0) {
      const { rawIncludedDate, eventStartsToday } = getPromotionDates(resolvedStart, tierKey);
      if (eventStartsToday) effectiveComingSoonDate = null;
      if (!eventStartsToday && effectiveComingSoonDate) {
        const { upgradeRequired, additionalDays } = calcPromotionUpgrade(effectiveComingSoonDate, rawIncludedDate);
        const selectedDays = Math.max(0, differenceInDays(new Date(resolvedStart), new Date(effectiveComingSoonDate)));
        promotionFields = {
          promotion_included_days: rule.includedDays,
          promotion_max_days: rule.maxDays,
          coming_soon_start_date: new Date(effectiveComingSoonDate).toISOString(),
          promotion_selected_days: selectedDays,
          promotion_upgrade_days: additionalDays,
          promotion_upgrade_required: upgradeRequired,
          promotion_status: upgradeRequired ? "upgrade_required" : "included",
        };
      }
    }
    // --- End promotion fields ---

    // Block publish if a promotion upgrade is required and not yet paid.
    if (status === "published" && promotionFields.promotion_upgrade_required && promotionFields.promotion_status !== "paid") {
      toast.error("Promotion upgrade payment is required before publishing with this Coming Soon date.");
      setSaving(false);
      return;
    }

    const eventData = {
      organizer_user_id: preserveOwner && isEditing ? event.organizer_user_id : user.id,
      organizer_business_id: preserveOwner && isEditing ? event.organizer_business_id : account.id,
      organizer_business_name: preserveOwner && isEditing ? event.organizer_business_name : account.business_name,
      organizer_logo: preserveOwner && isEditing ? event.organizer_logo : account.business_logo,
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
      startDateTime: resolvedStart,
      endDateTime: datesLocked ? event.endDateTime : new Date(form.endDateTime).toISOString(),
      ...promotionFields,
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
      flyer_url: form.flyer_url,
      logo: form.logo,
      public_contact_visibility: form.public_contact_visibility || "inherit",
      photos: event?.photos || [],
      updated_at: now,
    };

    const savedEvent = isEditing
      ? await base44.entities.VendorEvent.update(event.id, eventData)
      : await base44.entities.VendorEvent.create({ ...eventData, created_at: now });

    if (["multi_spot", "multi_location"].includes(form.event_type) && form.event_flags.length > 0) {
      await syncFlagsToEvent(savedEvent.id, form.event_flags);
    }

    await createCollaboratorInvitations(savedEvent, now);

    if (!isEditing && form.event_type === "multi_location") {
      const code = `VE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await base44.entities.EventInviteCode.create({
        event_id: savedEvent.id,
        invite_code: code,
        invite_link: `${window.location.origin}/VendorEventPublicPage?id=${savedEvent.id}&invite=${code}`,
        auto_approve: true,
        created_at: now,
      });
    }

    setCreatedEvent(savedEvent);
    if (!isEditing) {
      setForm({ ...initialForm });
      setCollaboratorInvitations([]);
    }
    setSaving(false);
    toast.success(isEditing ? "Event details updated" : status === "published" ? "Event published" : "Event saved as draft");
    onCreated?.(savedEvent);
  };

  return (
    <div className="space-y-6">
      {showPublicFields && (
        <>
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#2C4F4E] text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <div><h3 className="text-base font-bold text-slate-900">Event Details</h3><p className="text-xs text-slate-500">Public information shown to vendors and attendees.</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 pl-0 sm:pl-10">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Event Name *</Label>
                <Input placeholder="e.g. Summer Vendor Market 2026" value={form.title} onChange={(e) => update("title", e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</Label>
                <Input placeholder="e.g. Farmers Market, Craft Fair..." value={form.category} onChange={(e) => update("category", e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Event Type *</Label>
                <Select value={form.event_type} onValueChange={(value) => update("event_type", value)}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{VENDOR_EVENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</Label>
                <Textarea placeholder="Describe your event — what vendors and attendees can expect..." className="resize-none h-24 bg-white" value={form.description} onChange={(e) => update("description", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Custom Event Logo</Label>
                {form.logo ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
                    <img src={form.logo} alt="Event logo" className="h-16 w-16 rounded-lg border object-contain bg-slate-50" />
                    <div className="min-w-0 flex-1">
                      <a href={form.logo} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#5DADA5] underline">View selected logo ↗</a>
                      <p className="text-xs text-slate-500 mt-1">Shown on the public event page where event branding appears.</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => update("logo", "")}>Remove</Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 cursor-pointer hover:border-[#5DADA5] hover:bg-[#5DADA5]/5 transition-colors">
                    <span className="text-sm font-semibold text-slate-700">Upload Custom Logo</span>
                    <input type="file" accept="image/*" onChange={uploadLogo} disabled={uploadingLogo} className="hidden" />
                  </label>
                )}
                {uploadingLogo && <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="animate-spin">⏳</span> Uploading logo...</p>}
                <DefaultEventLogoPicker value={form.logo} onChange={(logo) => update("logo", logo)} />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#2C4F4E] text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div><h3 className="text-base font-bold text-slate-900">Public Contact Information</h3><p className="text-xs text-slate-500">Choose whether public visitors can see the organizer’s phone number, email address or website for this event.</p></div>
            </div>
            <div className="sm:pl-10 space-y-2">
              <Select value={form.public_contact_visibility || "inherit"} onValueChange={(value) => update("public_contact_visibility", value)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Use business setting</SelectItem>
                  <SelectItem value="show">Show for this event</SelectItem>
                  <SelectItem value="hide">Hide for this event</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Choose whether public visitors can see the organizer’s phone number, email address or website for this event.</p>
            </div>
          </div>

          {/* Section 3: Location & Schedule */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#2C4F4E] text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <div><h3 className="text-base font-bold text-slate-900">Location & Schedule</h3><p className="text-xs text-slate-500">When and where your event takes place.</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:pl-10">
              <div className="sm:col-span-2">
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#5DADA5] transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{form.display_address ? "📍 " + form.display_address : "No location selected yet"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">This address appears publicly on the event page and map.</p>
                  </div>
                  <Button type="button" onClick={openLocationPicker} className="shrink-0 bg-[#006168] text-white hover:bg-[#004d52] border border-[#006168] font-semibold shadow-sm">
                    {form.display_address ? "Change Location" : "Set Event Location"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Start Date & Time *</Label>
                <Input type="datetime-local" value={form.startDateTime} disabled={datesLocked} onChange={(e) => update("startDateTime", e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">End Date & Time *</Label>
                <Input type="datetime-local" value={form.endDateTime} disabled={datesLocked} onChange={(e) => update("endDateTime", e.target.value)} className="bg-white" />
                {datesLocked && <p className="text-xs text-amber-600 flex items-center gap-1">⚠ Locked — vendors already approved.</p>}
              </div>
            </div>
          </div>

          {/* Section 4: Flyer */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#2C4F4E] text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
              <div><h3 className="text-base font-bold text-slate-900">Event Flyer</h3><p className="text-xs text-slate-500">Optional — shown on the public event page.</p></div>
            </div>
            <div className="sm:pl-10 space-y-3">
              {form.flyer_url ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <a href={form.flyer_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#5DADA5] underline">View uploaded flyer ↗</a>
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => update("flyer_url", "")}>Remove</Button>
                  </div>
                  {!form.flyer_url.toLowerCase().includes(".pdf") && <img src={form.flyer_url} alt="Event flyer" className="max-h-64 w-full rounded-lg border object-contain bg-slate-50" />}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 cursor-pointer hover:border-[#5DADA5] hover:bg-[#5DADA5]/5 transition-colors">
                  <span className="text-2xl mb-2">🖼️</span>
                  <span className="text-sm font-semibold text-slate-700">Upload Flyer</span>
                  <span className="text-xs text-slate-500 mt-1">Image or PDF · Click to browse</span>
                  <input type="file" accept="image/*,.pdf" onChange={uploadFlyer} disabled={uploadingFlyer} className="hidden" />
                </label>
              )}
              {uploadingFlyer && <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="animate-spin">⏳</span> Uploading flyer...</p>}
            </div>
          </div>
        </>
      )}

      {showVendorFields && <div className="border-t border-slate-100 pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-[#2C4F4E] text-white flex items-center justify-center text-xs font-bold shrink-0">{showPublicFields ? "5" : "1"}</div>
          <div><h3 className="text-base font-bold text-slate-900">Vendor Setup</h3><p className="text-xs text-slate-500">Control how vendors join, pay, and get approved.</p></div>
        </div>
        <div className="sm:pl-10">
        <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-800 w-fit">
          <input type="checkbox" checked={form.open_to_vendors} onChange={(e) => update("open_to_vendors", e.target.checked)} className="w-4 h-4 rounded" />
          Open this event to vendors
        </label>

        {form.open_to_vendors && (
          <div className="space-y-4">
            <CollapsiblePanel title="Vendor Invitation Info" description="Tell vendors what to expect before they request or reserve a spot." defaultOpen>
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
            </CollapsiblePanel>

            <CollapsiblePanel title="Space Options" description="Create the space types vendors can reserve." count={form.vendor_space_options.length} defaultOpen>
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
            </CollapsiblePanel>

            <CollapsiblePanel title="Vendor Capacity" description="This controls how many vendors can reserve or request to join this event." defaultOpen>
              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#2C4F4E]">Maximum Vendors Allowed</Label>
                <Input type="number" placeholder="10" value={form.max_vendors} onChange={(e) => update("max_vendors", e.target.value)} />
                {form.max_vendors && <p className="text-xs text-slate-600">{form.max_vendors} maximum vendors</p>}
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel title="Reserve Payment" description="Set how vendors reserve their spot online." defaultOpen>
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
                  <p className="text-xs text-slate-500">Vendors pay this percentage to reserve their spot. The reserve payment is split between the organizer payout and platform reservation fee.</p>
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
            </CollapsiblePanel>
          </div>
        )}
        </div>
      </div>}

      {/* Event Promotion — only shown in full mode on the public fields section */}
      {showPublicFields && (
        <EventPromotionSection
          tierKey={account?.vendor_tier || "free"}
          eventStartDate={form.startDateTime ? new Date(form.startDateTime).toISOString() : ""}
          comingSoonDate={form.coming_soon_start_date}
          onComingSoonDate={(val) => update("coming_soon_start_date", val)}
          savedEventId={createdEvent?.id || (isEditing ? event?.id : null)}
          vendorAccountId={account?.id}
          onSaveDraft={!isEditing && !createdEvent ? async () => {
            await saveEvent("draft");
            // After saveEvent, createdEvent state is set — the EventPromotionSection
            // will re-render with savedEventId populated, showing the "Pay for Upgrade" button.
          } : null}
        />
      )}

      {showPublicFields && !isEditing && (
        <CreateEventCollaboratorsSection
          account={account}
          invitations={collaboratorInvitations}
          onChange={setCollaboratorInvitations}
        />
      )}

      {promotionUpgradeRequired && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-300 p-3 text-sm text-amber-800">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <p>
            <strong>Promotion upgrade payment is required before publishing with this Coming Soon date.</strong>
            {" "}You can still save as a draft.
          </p>
        </div>
      )}

      <div className="border-t border-slate-100 pt-5 flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {!isEditing && <Button variant="outline" disabled={saving} onClick={() => saveEvent("draft")} className="text-slate-600">Save as Draft</Button>}
          {isEditing && showPublicFields && (
            <>
              <Button variant="outline" disabled={saving || ["draft", "cancelled"].includes(form.status || event.status)} onClick={() => saveEvent("draft")} className="text-slate-600">Hide From Map</Button>
              <Button variant="outline" disabled={saving || (form.status || event.status) === "cancelled"} onClick={() => window.confirm("Cancel this event? It will be removed from the public map.") && saveEvent("cancelled")} className="border-red-200 text-red-600 hover:bg-red-50">Cancel Event</Button>
            </>
          )}
          {mode === "full" && <Button variant="outline" disabled={!createdEvent && !isEditing} onClick={() => setShowInviteVendors(true)}>Invite Vendors</Button>}
        </div>
        <Button disabled={saving} onClick={() => saveEvent(isEditing ? form.status || event.status : "published")} className="bg-[#2C4F4E] text-white hover:bg-[#3d6b6a] font-semibold px-6 shadow-sm">
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Publish Event"}
        </Button>
      </div>

      <EventLocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        eventType={form.event_type}
        value={form.latitude && form.longitude ? { latitude: Number(form.latitude), longitude: Number(form.longitude), display_address: form.display_address, geocoded_address: form.geocoded_address, radius_feet: Number(form.radius_feet || 500), flags: form.event_flags } : null}
        onChange={(location) => {
          setForm((prev) => ({ ...prev, display_address: location.display_address, geocoded_address: location.geocoded_address, latitude: location.latitude, longitude: location.longitude, radius_feet: String(location.radius_feet || 500), event_flags: location.flags || [] }));
          if (isEditing && ["multi_spot", "multi_location"].includes(form.event_type)) {
            syncFlagsToEvent(event.id, location.flags || []);
          }
        }}
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