import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getEventScheduleValidation, getNormalizedEventSchedule, shiftDate } from "@/lib/eventSchedule";
import { normalizeResidentialEventSingleDay } from "@/lib/residentialEventSchedule";

export default function EventScheduleStep({ formData, setFormData }) {
  const safeFormData = normalizeResidentialEventSingleDay(formData);
  const schedule = getNormalizedEventSchedule(safeFormData);
  const validation = getEventScheduleValidation(safeFormData);

  useEffect(() => {
    const normalized = normalizeResidentialEventSingleDay(formData);
    if (
      normalized.event_end_date !== formData.event_end_date ||
      normalized.start_datetime !== formData.start_datetime ||
      normalized.end_datetime !== formData.end_datetime ||
      normalized.startDateTime !== formData.startDateTime ||
      normalized.endDateTime !== formData.endDateTime
    ) {
      setFormData((prev) => normalizeResidentialEventSingleDay(prev));
    }
  }, [formData, setFormData]);

  const updateSchedule = (changes) => {
    const nextFormData = normalizeResidentialEventSingleDay({ ...formData, ...changes });
    const nextSchedule = getNormalizedEventSchedule(nextFormData);

    setFormData((prev) => {
      const comingSoonDays = Number(prev.coming_soon_package || 0);
      return normalizeResidentialEventSingleDay({
        ...prev,
        ...changes,
        event_start_date: nextSchedule.eventStartDate,
        event_end_date: nextSchedule.eventStartDate,
        event_start_time: nextSchedule.eventStartTime,
        event_end_time: nextSchedule.eventEndTime,
        coming_soon_start_date: comingSoonDays && nextSchedule.eventStartDate ? shiftDate(nextSchedule.eventStartDate, -comingSoonDays) : prev.coming_soon_start_date || "",
        start_datetime: nextSchedule.startLocal,
        end_datetime: nextSchedule.endLocal,
        startDateTime: nextSchedule.startLocal,
        endDateTime: nextSchedule.endLocal,
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Event Schedule *</h4>
          <p className="text-xs text-slate-400 mt-0.5">Residential Events are limited to one calendar day.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event_start_date" className="text-xs font-semibold text-slate-600">Event Date *</Label>
          <Input
            id="event_start_date"
            type="date"
            value={schedule.eventStartDate}
            onChange={(e) => updateSchedule({ event_start_date: e.target.value })}
            className="bg-white border-slate-200 focus-visible:ring-[#006168] focus-visible:border-[#006168] rounded-xl h-10"
          />
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

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Multi-day events require Vendor Events or Event Organizer tools.
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