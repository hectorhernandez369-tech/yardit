import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import EventPhotoUpload from "@/components/create/event/EventPhotoUpload";

const SPOT_TYPES = [
  { value: "halloween_decorations", label: "Halloween Decorations" },
  { value: "haunted", label: "Haunted House" },
  { value: "trick_or_treat", label: "Trick-or-Treat" },
  { value: "trunk_or_treat", label: "Trunk-or-Treat" },
  { value: "scary_yard", label: "Scary Yard" },
  { value: "light_show", label: "Light Show" },
];

export default function HalloweenOwnerEditDialog({ open, spot, user, onClose, onSaved }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!spot) return;
    setDraft({
      ...spot,
      halloween_spot_type: spot.halloween_spot_type || spot.halloween_icon_key || "halloween_decorations",
      halloween_tags: spot.halloween_tags || [],
      halloween_start_date: spot.halloween_start_date || spot.selectedRangeStartDate || String(spot.start_date_time || spot.startDateTime || "").slice(0, 10),
      halloween_end_date: spot.halloween_end_date || spot.selectedRangeEndDate || String(spot.end_date_time || spot.endDateTime || "").slice(0, 10),
      halloween_start_time: spot.halloween_start_time || spot.viewing_start_time || spot.openTime || "",
      halloween_end_time: spot.halloween_end_time || spot.viewing_end_time || spot.closeTime || "",
      photos: spot.photos || spot.photoUrls || [],
    });
  }, [spot]);

  if (!draft) return null;

  const type = draft.halloween_spot_type || "halloween_decorations";
  const candyPrimary = ["trick_or_treat", "trunk_or_treat"].includes(type);
  const hasTag = (tag) => (draft.halloween_tags || []).includes(tag);
  const toggleTag = (tag) => setDraft((prev) => ({
    ...prev,
    halloween_tags: hasTag(tag)
      ? (prev.halloween_tags || []).filter((item) => item !== tag)
      : [...(prev.halloween_tags || []), tag],
  }));

  const save = async () => {
    if (!draft.title?.trim()) return toast.error("Add a Halloween Spot title.");
    if (!draft.halloween_start_date || !draft.halloween_end_date) return toast.error("Choose the start and end dates.");
    if (draft.halloween_end_date < draft.halloween_start_date) return toast.error("End date must be after the start date.");
    if (!draft.halloween_start_time || !draft.halloween_end_time) return toast.error("Choose the start and end times.");
    if (draft.halloween_end_time <= draft.halloween_start_time) return toast.error("End time must be after the start time.");

    const ownerId = spot.owner_user_id || spot.ownerUserId || spot.created_by_id;
    const ownerEmail = String(spot.created_by || "").toLowerCase();
    const currentEmail = String(user?.email || "").toLowerCase();
    if (ownerId && ownerId !== user?.id && ownerEmail !== currentEmail) {
      toast.error("You can only edit your own Halloween Spot.");
      return;
    }

    const tags = candyPrimary ? (draft.halloween_tags || []).filter((tag) => tag !== "no_candy_here") : (draft.halloween_tags || []);
    setSaving(true);
    try {
      await base44.entities.Location.update(spot.id, {
        title: draft.title.trim(),
        display_title: draft.title.trim(),
        description: draft.description || "",
        halloween_spot_type: type,
        halloween_icon_key: type,
        halloween_tags: tags,
        halloween_candy_available: candyPrimary ? true : tags.includes("no_candy_here") ? false : draft.halloween_candy_available === true,
        halloween_walkthrough: draft.halloween_walkthrough === true,
        halloween_lights: draft.halloween_lights === true,
        halloween_sound: draft.halloween_sound === true,
        halloween_jump_scares: draft.halloween_jump_scares === true,
        halloween_suggested_age: draft.halloween_suggested_age || "",
        halloween_start_date: draft.halloween_start_date,
        halloween_end_date: draft.halloween_end_date,
        halloween_start_time: draft.halloween_start_time,
        halloween_end_time: draft.halloween_end_time,
        viewing_start_time: draft.halloween_start_time,
        viewing_end_time: draft.halloween_end_time,
        full_icon_activation_time: draft.halloween_start_time < "15:00" ? "15:00" : draft.halloween_start_time,
        photos: draft.photos || [],
        halloween_host_name: draft.halloween_host_name || "",
        halloween_admission: draft.halloween_admission || "",
        halloween_parking_notes: draft.halloween_parking_notes || "",
        halloween_activities: draft.halloween_activities || "",
      });
      toast.success("Halloween Spot updated");
      await onSaved?.();
      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Could not update Halloween Spot.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose?.()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Halloween Spot</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div className="space-y-1.5"><Label>Title</Label><Input value={draft.title || ""} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={draft.description || ""} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} /></div>

          <div className="space-y-1.5"><Label>Halloween Spot Type</Label><Select value={type} onValueChange={(value) => setDraft((p) => ({ ...p, halloween_spot_type: value, halloween_icon_key: value, halloween_tags: ["trick_or_treat", "trunk_or_treat"].includes(value) ? (p.halloween_tags || []).filter((tag) => tag !== "no_candy_here") : (p.halloween_tags || []), halloween_candy_available: ["trick_or_treat", "trunk_or_treat"].includes(value) ? true : p.halloween_candy_available }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SPOT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={draft.halloween_start_date || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_start_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>End date</Label><Input type="date" min={draft.halloween_start_date || undefined} value={draft.halloween_end_date || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_end_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Starts at</Label><Input type="time" value={draft.halloween_start_time || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_start_time: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Ends at</Label><Input type="time" value={draft.halloween_end_time || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_end_time: e.target.value }))} /></div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Kid Friendly" checked={hasTag("kid_friendly")} onChange={() => toggleTag("kid_friendly")} />
            {!candyPrimary && <Toggle label="No Candy Here" checked={hasTag("no_candy_here")} onChange={() => toggleTag("no_candy_here")} />}
            {!candyPrimary && !hasTag("no_candy_here") && <Toggle label="Candy Available" checked={draft.halloween_candy_available === true} onChange={(value) => setDraft((p) => ({ ...p, halloween_candy_available: value }))} />}
            <Toggle label="Walk-through" checked={draft.halloween_walkthrough === true} onChange={(value) => setDraft((p) => ({ ...p, halloween_walkthrough: value }))} />
            <Toggle label="Lights" checked={draft.halloween_lights === true} onChange={(value) => setDraft((p) => ({ ...p, halloween_lights: value }))} />
            <Toggle label="Sound / Music" checked={draft.halloween_sound === true} onChange={(value) => setDraft((p) => ({ ...p, halloween_sound: value }))} />
            <Toggle label="Jump Scares" checked={draft.halloween_jump_scares === true} onChange={(value) => setDraft((p) => ({ ...p, halloween_jump_scares: value }))} />
          </div>

          <div className="space-y-1.5"><Label>Suggested age (optional)</Label><Input value={draft.halloween_suggested_age || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_suggested_age: e.target.value }))} placeholder="All ages, 8+, Teens & adults" /></div>

          {type === "trunk_or_treat" && <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/60 p-4"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Host / organization</Label><Input value={draft.halloween_host_name || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_host_name: e.target.value }))} /></div><div className="space-y-1.5"><Label>Admission</Label><Input value={draft.halloween_admission || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_admission: e.target.value }))} placeholder="Free" /></div></div><div className="space-y-1.5"><Label>Parking notes</Label><Input value={draft.halloween_parking_notes || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_parking_notes: e.target.value }))} /></div><div className="space-y-1.5"><Label>Activities</Label><Input value={draft.halloween_activities || ""} onChange={(e) => setDraft((p) => ({ ...p, halloween_activities: e.target.value }))} placeholder="Games, costume contest, food vendors..." /></div></div>}

          <div className="space-y-1.5"><Label>Photos (up to 3)</Label><EventPhotoUpload value={draft.photos || []} maxPhotos={3} onChange={(photos) => setDraft((p) => ({ ...p, photos }))} /></div>

          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-purple-800 hover:bg-purple-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, checked, onChange }) {
  return <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span>{label}</span></label>;
}
