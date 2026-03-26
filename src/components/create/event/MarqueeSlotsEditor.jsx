import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

const createEmptySlot = () => ({
  id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  label: "",
  start_time: "",
  end_time: "",
});

export default function MarqueeSlotsEditor({ value = [], onChange, eventStartDate, eventEndDate }) {
  const slots = Array.isArray(value) ? value : [];

  const updateSlot = (index, changes) => {
    onChange(slots.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...changes } : slot)));
  };

  const addSlot = () => {
    onChange([...slots, createEmptySlot()]);
  };

  const removeSlot = (index) => {
    onChange(slots.filter((_, slotIndex) => slotIndex !== index));
  };

  return (
    <div className="space-y-4 rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
      <div>
        <h4 className="text-[#2C4F4E] font-semibold">Marquee Schedule Slots</h4>
        <p className="text-sm text-[#1F2937] opacity-80">Add the short schedule items that should rotate on the live marquee board.</p>
      </div>

      <div className="space-y-4">
        {slots.map((slot, index) => (
          <div key={slot.id || index} className="rounded-lg border border-[#2C4F4E]/20 bg-[#F3E6CF] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-[#2C4F4E]">Slot {index + 1}</p>
              <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => removeSlot(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <Label className="text-[#2C4F4E]">Short Label</Label>
              <Input
                value={slot.label || ""}
                onChange={(e) => updateSlot(index, { label: e.target.value.slice(0, 40) })}
                placeholder="e.g., VIP Entry"
                className="mt-2 border-[#2C4F4E] bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-[#2C4F4E]">Start Time</Label>
                <Input
                  type="datetime-local"
                  value={slot.start_time || ""}
                  min={eventStartDate ? `${eventStartDate}T00:00` : undefined}
                  max={eventEndDate ? `${eventEndDate}T23:59` : undefined}
                  onChange={(e) => updateSlot(index, { start_time: e.target.value })}
                  className="mt-2 border-[#2C4F4E] bg-white"
                />
              </div>
              <div>
                <Label className="text-[#2C4F4E]">End Time</Label>
                <Input
                  type="datetime-local"
                  value={slot.end_time || ""}
                  min={slot.start_time || (eventStartDate ? `${eventStartDate}T00:00` : undefined)}
                  max={eventEndDate ? `${eventEndDate}T23:59` : undefined}
                  onChange={(e) => updateSlot(index, { end_time: e.target.value })}
                  className="mt-2 border-[#2C4F4E] bg-white"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addSlot} className="gap-2 border-[#2C4F4E] text-[#2C4F4E]">
        <Plus className="w-4 h-4" />
        Add Schedule Slot
      </Button>
    </div>
  );
}