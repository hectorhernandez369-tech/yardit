export const makeScheduleRowId = () => `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const parseScheduleDate = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const usMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})/);
  if (usMatch) {
    const [, month, day, yearValue] = usMatch;
    const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return raw.slice(0, 10);
};

export const formatScheduleDate = (value) => {
  const parsed = parseScheduleDate(value);
  const match = parsed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || "";
  return `${Number(match[2])}/${Number(match[3])}/${match[1]}`;
};

export const parseScheduleTime = (eventDate, value, dateOverride) => {
  if (!value?.trim()) return "";
  const raw = value.trim().toLowerCase().replace(/[.]/g, ":").replace(/[^0-9:apm]/g, "");
  const meridiemMatch = raw.match(/([ap])m*$/);
  const meridiem = meridiemMatch ? `${meridiemMatch[1]}m` : "";
  const digits = raw.replace(/(am*|pm*)$/i, "").replace(/[^0-9]/g, "");
  const colonMatch = raw.replace(/(am*|pm*)$/i, "").match(/^(\d{1,2}):(\d{1,2})$/);

  let hours = 0;
  let minutes = 0;
  if (colonMatch) {
    hours = Number(colonMatch[1]);
    minutes = Number(colonMatch[2].padStart(2, "0").slice(0, 2));
  } else if (digits.length <= 2) {
    hours = Number(digits);
  } else if (digits.length === 3) {
    hours = Number(digits.slice(0, 1));
    minutes = Number(digits.slice(1));
  } else if (digits.length === 4) {
    hours = Number(digits.slice(0, 2));
    minutes = Number(digits.slice(2));
  } else {
    return value;
  }

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return value;

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