export const makeScheduleRowId = () => `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const parseScheduleTime = (eventDate, value, dateOverride) => {
  if (!value?.trim()) return "";
  const raw = value.trim().toLowerCase().replace(/\s+/g, "");
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return value;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3];
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  const date = dateOverride ? new Date(`${dateOverride}T00:00:00`) : new Date(eventDate || new Date());
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const offsetScheduleTime = (value, minutes, eventDate) => {
  const parsed = parseScheduleTime(eventDate, value);
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date.toISOString();
};

export const buildBlankScheduleRows = (count, fields, eventDate, timeBetweenMinutes = 90, startOrder = 0, previousStart = "") => {
  const rows = [];
  let nextStart = previousStart;

  for (let index = 0; index < Number(count || 0); index += 1) {
    if (nextStart) nextStart = offsetScheduleTime(nextStart, timeBetweenMinutes, eventDate);
    rows.push({
      id: makeScheduleRowId(),
      spot_id: fields[0]?.id || "",
      field_name: fields[0]?.title || "Main Event",
      title: "",
      start_time: nextStart || "",
      end_time: "",
      notes: "",
      date: "",
      sort_order: startOrder + index,
      isBlank: true,
    });
  }

  return rows;
};

export const normalizeScheduleRows = (rows) => rows.map((row, index) => ({ ...row, sort_order: index }));

export const groupScheduleRows = (rows) => rows.reduce((groups, row) => {
  const key = row.field_name || "Main Event";
  if (!groups[key]) groups[key] = [];
  groups[key].push(row);
  return groups;
}, {});

export const cleanRowsForSave = (rows, eventId) => rows
  .filter((row) => row.title?.trim() && row.start_time)
  .map((row, index) => ({
    event_id: eventId,
    spot_id: row.spot_id || "",
    field_name: row.field_name || "Main Event",
    title: row.title.trim(),
    start_time: row.start_time,
    end_time: row.end_time || "",
    notes: row.notes || "",
    date: row.date || "",
    sort_order: index,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));