import React from "react";
import { Card } from "@/components/ui/card";
import { EVENT_ICONS, getEventIconEmoji, formatEventTierLabel } from "@/lib/eventListingConfig";

export default function EventIconStep({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Event Icon</h3>
        <p className="text-sm text-[#1F2937] opacity-80">Choose the icon visitors will see for your event.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {EVENT_ICONS.map((icon) => {
          const selected = formData.event_icon === icon;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, event_icon: icon }))}
              className={`rounded-xl border p-4 text-left transition-all ${selected ? "border-[#F4A849] bg-white shadow-md" : "border-[#2C4F4E]/20 bg-[#F3E6CF] hover:border-[#2C4F4E]/40"}`}
            >
              <div className="text-3xl mb-2">{getEventIconEmoji(icon)}</div>
              <div className="font-medium text-[#2C4F4E] text-sm">{icon.replace(/_/g, " ")}</div>
            </button>
          );
        })}
      </div>

      <Card className="p-4 border border-[#2C4F4E]/15 bg-white/70 shadow-none">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Event</div>
            <div className="font-semibold text-[#2C4F4E]">{formData.event_name || "Untitled Event"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Tier</div>
            <div className="font-semibold text-[#2C4F4E]">{formatEventTierLabel(formData.event_tier)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Icon</div>
            <div className="font-semibold text-[#2C4F4E]">{getEventIconEmoji(formData.event_icon)} {String(formData.event_icon || "none selected").replace(/_/g, " ")}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}