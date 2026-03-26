import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function EventScheduleStep({ formData, setFormData }) {
  const hasInvalidRange = formData.start_datetime && formData.end_datetime && new Date(formData.end_datetime) <= new Date(formData.start_datetime);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Date &amp; Time</h3>
        <p className="text-sm text-[#1F2937] opacity-80">Set the event start and end times.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-[#2C4F4E]" htmlFor="start_datetime">Start Date &amp; Time *</Label>
          <Input
            id="start_datetime"
            type="datetime-local"
            value={formData.start_datetime || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, start_datetime: e.target.value, startDateTime: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
            className="border-[#2C4F4E] bg-[#F3E6CF] mt-2"
          />
        </div>
        <div>
          <Label className="text-[#2C4F4E]" htmlFor="end_datetime">End Date &amp; Time *</Label>
          <Input
            id="end_datetime"
            type="datetime-local"
            value={formData.end_datetime || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, end_datetime: e.target.value, endDateTime: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
            className="border-[#2C4F4E] bg-[#F3E6CF] mt-2"
          />
        </div>
      </div>

      {hasInvalidRange && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">End date and time must be after the start date and time.</div>}
    </div>
  );
}