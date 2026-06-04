export const WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export function normalizeRecurringSchedule(schedule = []) {
  return WEEKDAYS.map((day) => {
    const existing = (schedule || []).find((item) => Number(item.day_of_week) === day.value) || {};
    return {
      day_of_week: day.value,
      enabled: !!existing.enabled,
      start_time: existing.start_time || "",
      end_time: existing.end_time || "",
    };
  });
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesFromTime(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function isWithinTimeWindow(startTime, endTime, now = new Date()) {
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  if (start === null || end === null) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  if (end < start) return current >= start || current <= end;
  return current >= start && current <= end;
}

function endDateForToday(endTime, now = new Date()) {
  const [hours = 23, minutes = 59] = String(endTime || "23:59").split(":").map(Number);
  const end = new Date(now);
  end.setHours(hours, minutes, 0, 0);
  if (end < now) end.setDate(end.getDate() + 1);
  return end;
}

export function getVendorPinActiveSchedule(pin, now = new Date()) {
  if (!pin || pin.is_active === false) return null;
  if (!["scheduled", "active"].includes(pin.schedule_status)) return null;

  const lat = Number(pin.scheduled_lat);
  const lng = Number(pin.scheduled_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const recurring = normalizeRecurringSchedule(pin.recurring_schedule).filter((item) => item.enabled);
  const todayRecurring = recurring.find((item) => item.day_of_week === now.getDay());
  if (todayRecurring && isWithinTimeWindow(todayRecurring.start_time, todayRecurring.end_time, now)) {
    return {
      type: "recurring",
      startTime: todayRecurring.start_time,
      endTime: todayRecurring.end_time,
      endDateTime: endDateForToday(todayRecurring.end_time, now),
    };
  }

  if (pin.scheduled_date === localDateKey(now) && isWithinTimeWindow(pin.scheduled_start_time, pin.scheduled_end_time, now)) {
    return {
      type: "one_time",
      startTime: pin.scheduled_start_time,
      endTime: pin.scheduled_end_time,
      endDateTime: endDateForToday(pin.scheduled_end_time, now),
    };
  }

  return null;
}

export function formatRecurringScheduleSummary(schedule = []) {
  const enabled = normalizeRecurringSchedule(schedule).filter((item) => item.enabled);
  if (enabled.length === 0) return "";
  return enabled
    .map((item) => {
      const day = WEEKDAYS.find((weekday) => weekday.value === item.day_of_week)?.short || "Day";
      return `${day} ${item.start_time || "--:--"}–${item.end_time || "--:--"}`;
    })
    .join(" · ");
}