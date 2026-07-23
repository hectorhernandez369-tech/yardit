export const makeScheduleRowId = () => `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const excelSerialToIsoDate = (value) => {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 1 || serial > 100000) return "";
  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const parseScheduleDate = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const excelDate = excelSerialToIsoDate(value);
  if (excelDate) return excelDate;

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
  return "";
};

export const formatScheduleDate = (value) => {
  const parsed = parseScheduleDate(value);
  const match = parsed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || "";
  return `${Number(match[2])}/${Number(match[3])}/${match[1]}`;
};

export const parseScheduleTime = (eventDate, value, dateOverride) => {
  if (value === null || value === undefined || String(value).trim() === "") return "";

  const rawValue = String(value).trim();
  const numericTime = Number(rawValue);

  if (Number.isFinite(numericTime) && numericTime > 0 && numericTime < 1) {
    const totalMinutes = Math.round(numericTime * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const parsedDate = parseScheduleDate(dateOverride) || parseScheduleDate(eventDate) || new Date().toISOString().slice(0, 10);
    const date = new Date(`${parsedDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  }

  const raw = rawValue.toLowerCase().replace(/[.]/g, ":").replace(/[^0-9:apm]/g, "");
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
    return "";
  }

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59 || Number.isNaN(hours) || Number.isNaN(minutes)) return "";

  const parsedDate = parseScheduleDate(dateOverride) || parseScheduleDate(eventDate) || new Date().toISOString().slice(0, 10);
  const date = new Date(`${parsedDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
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

export const getScheduleFieldName = (row) => String(row?.field_name || row?.location || row?.spot_name || "Main Event").trim() || "Main Event";

export const getScheduleStartTime = (row) => {
  const value = row?.start_time;
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
};

export const sortScheduleRows = (rows = []) => [...rows].sort((a, b) => {
  const aField = getScheduleFieldName(a).toLowerCase();
  const bField = getScheduleFieldName(b).toLowerCase();
  const fieldCompare = aField.localeCompare(bField, undefined, { numeric: true, sensitivity: "base" });
  if (fieldCompare !== 0) return fieldCompare;
  const timeCompare = getScheduleStartTime(a) - getScheduleStartTime(b);
  if (timeCompare !== 0) return timeCompare;
  return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
});

export const normalizeAndSortScheduleRows = (rows = []) => sortScheduleRows(rows).map((row, index) => ({ ...row, sort_order: index }));

export const validateScheduleRows = (rows = [], fields = []) => {
  const validFieldIds = new Set(fields.map((field) => field.id).filter(Boolean));

  return rows.map((row, index) => {
    const errors = [];

    if (!String(row?.title || "").trim()) errors.push("Activity or game name is required.");

    const startDate = row?.start_time ? new Date(row.start_time) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) errors.push("A valid start date and time is required.");

    if (fields.length > 1 && (!row?.spot_id || !validFieldIds.has(row.spot_id))) errors.push("A valid event field must be assigned.");

    if (row?.end_time) {
      const endDate = new Date(row.end_time);
      if (Number.isNaN(endDate.getTime())) {
        errors.push("The end time is invalid.");
      } else if (startDate && !Number.isNaN(startDate.getTime()) && endDate.getTime() < startDate.getTime()) {
        errors.push("The end time cannot be before the start time.");
      }
    }

    return { ...row, validation_errors: errors, row_number: index + 1 };
  });
};

export const groupScheduleRows = (rows = []) => {
  const sortedRows = sortScheduleRows(rows);
  return sortedRows.reduce((groups, row) => {
    const fieldName = getScheduleFieldName(row);
    if (!groups[fieldName]) groups[fieldName] = [];
    groups[fieldName].push(row);
    return groups;
  }, {});
};

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