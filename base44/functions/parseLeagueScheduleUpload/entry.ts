import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as XLSX from 'npm:xlsx@0.18.5';

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const excelDateToIso = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = clean(value);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
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

const parseRows = (rows, sheetName) => {
  const games = [];
  const headerIndex = rows.findIndex((row) => row.some((cell) => /^time$/i.test(clean(cell))) && row.some((cell) => isDivision(cell)));
  if (headerIndex < 0) return games;

  const header = rows[headerIndex];
  const gameDate = findDate(rows, sheetName);
  const blocks = [];

  for (let col = 0; col < header.length - 2; col += 1) {
    if (/^time$/i.test(clean(header[col])) && isDivision(header[col + 1]) && /^home$/i.test(clean(header[col + 2]))) {
      blocks.push({ timeCol: col, awayCol: col + 1, homeCol: col + 2, division: clean(header[col + 1]) });
      col += 2;
    }
  }

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (const block of blocks) {
      const away = clean(row[block.awayCol]);
      const home = clean(row[block.homeCol]);
      const time = clean(row[block.timeCol]);
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