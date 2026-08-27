import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X } from "lucide-react";
import EventFlagIconPicker from "./EventFlagIconPicker";
import FlagScheduleEditor from "./FlagScheduleEditor";
import { getEventFlagIcon, getEventFlagIconAsset, getEventFlagIconLabel } from "@/lib/eventFlagIcons";

export default function EventFlagQuickEditPanel({ draftSpot, setDraftSpot, originalSpot, eventDate, timeBetweenMinutes, onTimeBetweenChange, onSave, onCancel, isSaving }) {
  const [applyToAll, setApplyToAll] = useState(false);
  const iconAsset = getEventFlagIconAsset(draftSpot.icon_key);

  return (
    <div className="mt-2 rounded-2xl border-2 border-[#5DADA5]/40 bg-[#F0FCFA] p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#2C4F4E] bg-[#F4A849]">
            {iconAsset ? (
              <img src={iconAsset} alt="" className="h-10 w-10 object-contain" />
            ) : (
              <span className="text-xl">{getEventFlagIcon(draftSpot.icon_key)}</span>
            )}
          </span>
          <span className="mt-1 block max-w-20 text-[10px] font-bold leading-tight text-[#2C4F4E]">{getEventFlagIconLabel(draftSpot.icon_key)}</span>
        </div>
        <div>
          <h3 className="text-lg font-black text-[#2C4F4E]">Quick Edit</h3>
          <p className="text-xs text-slate-600">Changes are attached to this flag.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-[#2C4F4E]">Flag Name</Label>
        <Input value={draftSpot.title || ""} onChange={(e) => setDraftSpot((prev) => ({ ...prev, title: e.target.value }))} placeholder="Field 1, Main Stage, Food Court" />
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-[#2C4F4E]">Icon</Label>
        <EventFlagIconPicker value={draftSpot.icon_key || "flag"} onChange={(iconKey) => setDraftSpot((prev) => ({ ...prev, icon_key: iconKey }))} />
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-[#2C4F4E]">Optional Description</Label>
        <Textarea value={draftSpot.description || ""} onChange={(e) => setDraftSpot((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional details for this flag" />
      </div>

      <FlagScheduleEditor
        entries={draftSpot.schedule_entries || []}
        eventDate={eventDate}
        timeBetweenMinutes={timeBetweenMinutes}
        onTimeBetweenChange={onTimeBetweenChange}
        onChange={(entries) => setDraftSpot((prev) => ({ ...prev, schedule_entries: entries }))}
      />

      <label className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-[#2C4F4E] border border-[#5DADA5]/20">
        <Checkbox checked={applyToAll} onCheckedChange={(checked) => setApplyToAll(checked === true)} />
        <span>
          <span className="block font-bold">Apply to All Flags</span>
          <span className="text-xs text-slate-600">Applies changed icon/description settings to all flags, while keeping each flag name unique.</span>
        </span>
      </label>

      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button type="button" onClick={() => onSave({ applyToAll, originalSpot })} disabled={isSaving} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">
          <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
