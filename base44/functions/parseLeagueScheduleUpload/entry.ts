import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as XLSX from 'npm:xlsx@0.18.5';

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const excelTimeToText = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = value.getHours();
    const minutes = value.getMinutes();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && Number.isFinite(parsed.H)) {
      const suffix = parsed.H >= 12 ? 'PM' : 'AM';
      const hour12 = parsed.H % 12 || 12;
      return `${hour12}:${String(parsed.M || 0).padStart(2, '0')} ${suffix}`;
    }
  }
  return clean(value);
};

const excelDateToIso = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = clean(value);
  const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const us = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (us) {
    const year = us[3] ? (String(us[3]).length === 2 ? `20${us[3]}` : us[3]) : new Date().getFullYear();
    return `${year}-${String(us[1]).padStart(2, '0')}-${String(us[2]).padStart(2, '0')}`;
  }
  const namedDate = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text) ? new Date(text) : null;
  return namedDate && !Number.isNaN(namedDate.getTime()) ? namedDate.toISOString().slice(0, 10) : '';
};

const findDate = (rows, fallbackName) => {
  for (const row of rows.slice(0, 4)) {
    for (const cell of row.slice(0, 3)) {
      const date = excelDateToIso(cell);
      if (date) return date;
    }
  }
  const dateFromName = clean(fallbackName).match(/(\d{4})[-_ ]?(\d{2})[-_ ]?(\d{2})/);
  return dateFromName ? `${dateFromName[1]}-${dateFromName[2]}-${dateFromName[3]}` : '';
};

const isDivision = (value) => /^[0-9]{1,2}U$/i.test(clean(value)) || /division|varsity|junior|peewee|flag/i.test(clean(value));
const isTimeHeader = (value) => /^(time|start|start time|time slot|timeslot)$/i.test(clean(value));
const isHomeHeader = (value) => /^home( team)?$/i.test(clean(value));
const isFieldHeader = (value) => /^field\b/i.test(clean(value));

const parseFieldCell = (cellValue, fieldName, sheetName, gameDate, time, rowIndex) => {
  const raw = clean(cellValue);
  if (!raw || /^bye$/i.test(raw)) return null;
  const divMatch = raw.match(/\(\s*([0-9]{1,2}U)\s*\)/i);
  const division = divMatch ? clean(divMatch[1]).toUpperCase() : '';
  let teamsText = raw.replace(/\(\s*[0-9]{1,2}U\s*\)/i, '').trim();
  const vsMatch = teamsText.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (!vsMatch) return null;
  const away = clean(vsMatch[1]);
  const home = clean(vsMatch[2]);
  if (!away || !home) return null;
  if (/^bye$/i.test(away) || /^bye$/i.test(home)) return null;
  return {
    week: clean(sheetName),
    game_date: gameDate,
    start_time: time,
    division,
    age_group: division,
    away_team: away,
    home_team: home,
    game_title: `${away} vs ${home}`,
    field_name: fieldName,
    location: fieldName,
    notes: clean(sheetName),
    source_row_key: `${sheetName}|${gameDate}|${division}|${rowIndex}|${fieldName}|${away}|${home}|${time}`.toLowerCase(),
  };
};

const parseMultiFieldFormat = (rows, headerIndex, header, sheetName, gameDate) => {
  const games = [];
  let timeCol = header.findIndex((cell) => isTimeHeader(cell));
  if (timeCol < 0) timeCol = 0;
  const fieldCols = [];
  for (let col = 0; col < header.length; col += 1) {
    if (col === timeCol) continue;
    if (isFieldHeader(header[col])) fieldCols.push({ col, fieldName: clean(header[col]) });
  }
  if (!fieldCols.length) return games;

  let lastTime = '';
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rowTime = excelTimeToText(row[timeCol]);
    if (rowTime) lastTime = rowTime;
    const time = rowTime || lastTime || '';
    for (const field of fieldCols) {
      const game = parseFieldCell(row[field.col], field.fieldName, sheetName, gameDate, time, rowIndex);
      if (game) games.push(game);
    }
  }
  return games;
};

const parseRows = (rows, sheetName) => {
  const games = [];
  const headerIndex = rows.findIndex((row) => row.some((cell) => isTimeHeader(cell)));
  if (headerIndex < 0) return games;

  const header = rows[headerIndex];
  const gameDate = findDate(rows, sheetName);

  const hasFieldHeaders = header.some((cell) => isFieldHeader(cell));
  const hasDivisionPairs = header.some((cell, i) => isDivision(cell) && isHomeHeader(header[i + 1]));

  if (hasFieldHeaders && !hasDivisionPairs) {
    return parseMultiFieldFormat(rows, headerIndex, header, sheetName, gameDate);
  }

  const blocks = [];
  for (let col = 0; col < header.length - 1; col += 1) {
    if (!isDivision(header[col]) || !isHomeHeader(header[col + 1])) continue;
    let timeCol = -1;
    for (let left = col - 1; left >= 0; left -= 1) {
      if (isTimeHeader(header[left])) {
        timeCol = left;
        break;
      }
    }
    if (timeCol >= 0) blocks.push({ timeCol, awayCol: col, homeCol: col + 1, division: clean(header[col]) });
  }

  const lastTimeByColumn = {};
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (const block of blocks) {
      const away = clean(row[block.awayCol]);
      const home = clean(row[block.homeCol]);
      const rowTime = excelTimeToText(row[block.timeCol]);
      if (rowTime) lastTimeByColumn[block.timeCol] = rowTime;
      const time = rowTime || lastTimeByColumn[block.timeCol] || '';
      if (!away || !home) continue;
      if (/^bye$/i.test(away) || /^bye$/i.test(home)) continue;
      games.push({
        week: clean(sheetName),
        game_date: gameDate,
        start_time: time,
        division: block.division,
        age_group: block.division,
        away_team: away,
        home_team: home,
        game_title: `${away} at ${home}`,
        field_name: '',
        location: '',
        notes: clean(sheetName),
        source_row_key: `${sheetName}|${gameDate}|${block.division}|${rowIndex}|${away}|${home}|${time}`.toLowerCase(),
      });
    }
  }

  return games;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) return Response.json({ error: 'Unable to download schedule file' }, { status: 400 });

    const bytes = new Uint8Array(await fileResponse.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
    const games = [];

    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: '' });
      games.push(...parseRows(rows, sheetName));
    }

    return Response.json({ games, count: games.length, sheets: workbook.SheetNames });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});