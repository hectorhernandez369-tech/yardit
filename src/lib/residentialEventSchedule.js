function getDatePart(value) {
  return String(value || "").slice(0, 10);
}

function getTimePart(...values) {
  for (const value of values) {
    const text = String(value || "");
    if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5);
    const timeIndex = text.indexOf("T");
    if (timeIndex >= 0 && text.length >= timeIndex + 6) return text.slice(timeIndex + 1, timeIndex + 6);
  }
  return "";
}

export function normalizeResidentialEventSingleDay(data = {}) {
  if (data.listingType !== "event") return data;

  const eventStartDate = data.event_start_date || getDatePart(data.start_datetime) || getDatePart(data.startDateTime);
  const eventStartTime = getTimePart(data.event_start_time, data.start_datetime, data.startDateTime);
  const eventEndTime = getTimePart(data.event_end_time, data.end_datetime, data.endDateTime);
  const startLocal = eventStartDate && eventStartTime ? `${eventStartDate}T${eventStartTime}` : "";
  const endLocal = eventStartDate && eventEndTime ? `${eventStartDate}T${eventEndTime}` : "";

  return {
    ...data,
    event_start_date: eventStartDate,
    event_end_date: eventStartDate,
    event_start_time: eventStartTime,
    event_end_time: eventEndTime,
    start_datetime: startLocal || data.start_datetime || "",
    end_datetime: endLocal || data.end_datetime || "",
    startDateTime: startLocal || data.startDateTime || "",
    endDateTime: endLocal || data.endDateTime || "",
  };
}