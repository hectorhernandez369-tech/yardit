const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, "0");
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getNormalizedEventSchedule(formData = {}) {
  const eventStartDate = formData.event_start_date || formData.start_datetime?.slice(0, 10) || "";
  const eventEndDate = formData.event_end_date || formData.end_datetime?.slice(0, 10) || "";
  const eventStartTime = formData.event_start_time || formData.start_datetime?.slice(11, 16) || "";
  const eventEndTime = formData.event_end_time || formData.end_datetime?.slice(11, 16) || "";
  const comingSoonStartDate = formData.coming_soon_start_date || "";

  const startLocal = eventStartDate && eventStartTime ? `${eventStartDate}T${eventStartTime}` : "";
  const endLocal = eventEndDate && eventEndTime ? `${eventEndDate}T${eventEndTime}` : "";
  const startDate = startLocal ? new Date(startLocal) : null;
  const endDate = endLocal ? new Date(endLocal) : null;
  const comingSoonEarliestDate = eventStartDate ? shiftDate(eventStartDate, -3) : "";

  return {
    comingSoonStartDate,
    comingSoonEarliestDate,
    eventStartDate,
    eventEndDate,
    eventStartTime,
    eventEndTime,
    startLocal,
    endLocal,
    startDate,
    endDate,
  };
}

export function getEventScheduleValidation(formData = {}) {
  const schedule = getNormalizedEventSchedule(formData);
  const errors = [];

  if (schedule.comingSoonStartDate && schedule.eventStartDate) {
    if (schedule.comingSoonStartDate > schedule.eventStartDate) {
      errors.push("Coming Soon must be on or before the Event Start Date.");
    }
    if (schedule.comingSoonEarliestDate && schedule.comingSoonStartDate < schedule.comingSoonEarliestDate) {
      errors.push("Coming Soon can begin up to 3 days before the Event Start Date.");
    }
  }

  if (schedule.startDate && schedule.endDate) {
    if (schedule.endDate <= schedule.startDate) {
      errors.push("End date and time must be after the start date and time.");
    }
    if (schedule.endDate - schedule.startDate > FIVE_DAYS_MS) {
      errors.push("Live event duration cannot exceed 5 days.");
    }
  }

  return {
    ...schedule,
    errors,
    hasRequiredFields: Boolean(
      schedule.eventStartDate &&
      schedule.eventEndDate &&
      schedule.eventStartTime &&
      schedule.eventEndTime
    ),
  };
}