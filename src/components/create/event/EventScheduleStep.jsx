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
      startDateTime: nextSchedule.startLocal,
      endDateTime: nextSchedule.endLocal,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Live Event Schedule */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Live Event Schedule *</h4>
          <p className="text-xs text-slate-400 mt-0.5">Your live event can run for up to 5 days total.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="event_start_date" className="text-xs font-semibold text-slate-600">Start Date *</Label>
            <Input
              id="event_start_date"
              type="date"
              value={schedule.eventStartDate}
              onChange={(e) => updateSchedule({ event_start_date: e.target.value })}
              className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event_end_date" className="text-xs font-semibold text-slate-600">End Date *</Label>
            <Input
              id="event_end_date"
              type="date"
              value={schedule.eventEndDate}
              min={schedule.eventStartDate || undefined}
              onChange={(e) => updateSchedule({ event_end_date: e.target.value })}
              className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="event_start_time" className="text-xs font-semibold text-slate-600">Start Time *</Label>
            <Input
              id="event_start_time"
              type="time"
              value={schedule.eventStartTime}
              onChange={(e) => updateSchedule({ event_start_time: e.target.value })}
              className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event_end_time" className="text-xs font-semibold text-slate-600">End Time *</Label>
            <Input
              id="event_end_time"
              type="time"
              value={schedule.eventEndTime}
              onChange={(e) => updateSchedule({ event_end_time: e.target.value })}
              className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-10"
            />
          </div>
        </div>
      </div>

      {/* Coming Soon (optional) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Coming Soon <span className="text-slate-400 font-normal">(optional)</span></h4>
          <p className="text-xs text-slate-400 mt-0.5">Start promoting up to 3 days before your live event begins.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Coming Soon Start Date</Label>
          <Input
            type="date"
            value={schedule.comingSoonStartDate}
            min={schedule.eventStartDate ? schedule.comingSoonEarliestDate : undefined}
            max={schedule.eventStartDate || undefined}
            onChange={(e) => updateSchedule({ coming_soon_start_date: e.target.value })}
            className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-10"
          />
        </div>
      </div>

      {validation.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-1">
          {validation.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}