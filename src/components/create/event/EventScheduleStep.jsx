import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getEventScheduleValidation, getNormalizedEventSchedule } from "@/lib/eventSchedule";

export default function EventScheduleStep({ formData, setFormData }) {
  const schedule = getNormalizedEventSchedule(formData);
  const validation = getEventScheduleValidation(formData);

  const updateSchedule = (changes) => {
    const nextFormData = { ...formData, ...changes };
    const nextSchedule = getNormalizedEventSchedule(nextFormData);

    setFormData((prev) => ({
      ...prev,
      ...changes,
      event_start_date: nextSchedule.eventStartDate,
      event_end_date: nextSchedule.eventEndDate,
      event_start_time: nextSchedule.eventStartTime,
      event_end_time: nextSchedule.eventEndTime,
      coming_soon_start_date: nextSchedule.comingSoonStartDate,
      start_datetime: nextSchedule.startLocal,
      end_datetime: nextSchedule.endLocal,
      startDateTime: nextSchedule.startLocal ? new Date(nextSchedule.startLocal).toISOString() : "",
      endDateTime: nextSchedule.endLocal ? new Date(nextSchedule.endLocal).toISOString() : "",
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Date &amp; Time</h3>
        <p className="text-sm text-[#1F2937] opacity-80">Set when the event can start advertising and when the live event begins and ends.</p>
      </div>

      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4 space-y-4">
        <div>
          <Label className="text-[#2C4F4E]">Optional Coming Soon Start Date</Label>
          <Input
            type="date"
            value={schedule.comingSoonStartDate}
            min={schedule.eventStartDate ? schedule.comingSoonEarliestDate : undefined}
            max={schedule.eventStartDate || undefined}
            onChange={(e) => updateSchedule({ coming_soon_start_date: e.target.value })}
            className="bg-[#F3E6CF] border-[#2C4F4E] mt-2"
          />
          <p className="text-xs text-[#1F2937] opacity-80 mt-2">
            Optional: start promoting the event up to 3 days before the live event begins.
          </p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4 space-y-4">
        <div>
          <h4 className="text-[#2C4F4E] font-semibold">Live Event Schedule</h4>
          <p className="text-sm text-[#1F2937] opacity-80">Your live event can run for up to 5 days total.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="event_start_date">Event Start Date *</Label>
            <Input
              id="event_start_date"
              type="date"
              value={schedule.eventStartDate}
              onChange={(e) => updateSchedule({ event_start_date: e.target.value })}
              className="bg-[#F3E6CF] border-[#2C4F4E] mt-2"
            />
          </div>
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="event_end_date">Event End Date *</Label>
            <Input
              id="event_end_date"
              type="date"
              value={schedule.eventEndDate}
              min={schedule.eventStartDate || undefined}
              onChange={(e) => updateSchedule({ event_end_date: e.target.value })}
              className="bg-[#F3E6CF] border-[#2C4F4E] mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="event_start_time">Start Time *</Label>
            <Input
              id="event_start_time"
              type="time"
              value={schedule.eventStartTime}
              onChange={(e) => updateSchedule({ event_start_time: e.target.value })}
              className="bg-[#F3E6CF] border-[#2C4F4E] mt-2"
            />
          </div>
          <div>
            <Label className="text-[#2C4F4E]" htmlFor="event_end_time">End Time *</Label>
            <Input
              id="event_end_time"
              type="time"
              value={schedule.eventEndTime}
              onChange={(e) => updateSchedule({ event_end_time: e.target.value })}
              className="bg-[#F3E6CF] border-[#2C4F4E] mt-2"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Coming Soon is optional. If you use it, promotion can start up to 3 days before the live event. The live event itself can last up to 5 days.
      </div>

      {validation.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 space-y-1">
          {validation.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}