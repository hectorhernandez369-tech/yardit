export const LEAGUE_GAME_STATUSES = ["upcoming", "live", "halftime", "delayed", "postponed", "cancelled", "final"];

const pad = (value) => String(value).padStart(2, "0");

export const toDateOnly = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
  const us = text.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (us) {
    const year = us[3] ? (String(us[3]).length === 2 ? `20${us[3]}` : us[3]) : new Date().getFullYear();
    return `${year}-${pad(us[1])}-${pad(us[2])}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

export const parseGameTime = (dateValue, timeValue) => {
  const date = toDateOnly(dateValue) || new Date().toISOString().slice(0, 10);
  if (typeof timeValue === "number" && timeValue > 0 && timeValue < 1) {
    const totalMinutes = Math.round(timeValue * 24 * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return new Date(`${date}T${pad(hour)}:${pad(minute)}:00`).toISOString();
  }
  const raw = String(timeValue || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("t")) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }
  const compact = raw.replace(/\s+/g, "");
  const match = compact.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour > 23 && compact.length >= 4) hour = Number(compact.slice(0, -2));
  return new Date(`${date}T${pad(hour)}:${pad(minute)}:00`).toISOString();
};

export const getRowValue = (row, labels) => {
  const wanted = labels.map((label) => label.toLowerCase());
  const key = Object.keys(row || {}).find((item) => wanted.includes(item.trim().toLowerCase()));
  return key ? row[key] : "";
};

export const buildGameTitle = (game) => game.game_title || [game.home_team, game.away_team].filter(Boolean).join(" vs ") || "Game";

export const buildSourceRowKey = (game) => [
  game.vendor_account_id,
  game.game_date,
  game.start_time,
  game.division || game.age_group,
  game.home_team,
  game.away_team,
  game.field_name,
].map((value) => String(value || "").trim().toLowerCase()).join("|");

export const normalizeLeagueGame = (raw, account, index = 0, sourceImportId = "manual") => {
  const homeTeam = String(getRowValue(raw, ["home team", "home", "team 1"]) || raw.home_team || "").trim();
  const awayTeam = String(getRowValue(raw, ["away team", "away", "team 2", "opponent"]) || raw.away_team || "").trim();
  const gameDate = toDateOnly(getRowValue(raw, ["date", "game date"]) || raw.game_date);
  const game = {
    vendor_account_id: account.id,
    league_name: String(getRowValue(raw, ["league", "league name"]) || raw.league_name || account.business_name || "").trim(),
    season: String(getRowValue(raw, ["season"]) || raw.season || "").trim(),
    division: String(getRowValue(raw, ["division", "age group", "age", "level"]) || raw.division || raw.age_group || "").trim(),
    age_group: String(getRowValue(raw, ["age group", "age", "division"]) || raw.age_group || raw.division || "").trim(),
    game_title: String(getRowValue(raw, ["game", "activity", "matchup", "title"]) || raw.game_title || [homeTeam, awayTeam].filter(Boolean).join(" vs ")).trim(),
    home_team: homeTeam,
    away_team: awayTeam,
    home_town: String(getRowValue(raw, ["home town", "home city", "town", "organization"]) || raw.home_town || "").trim(),
    away_town: String(getRowValue(raw, ["away town", "away city"]) || raw.away_town || "").trim(),
    game_date: gameDate,
    start_time: parseGameTime(gameDate, getRowValue(raw, ["start time", "start", "time"]) || raw.start_time),
    end_time: parseGameTime(gameDate, getRowValue(raw, ["end time", "end"]) || raw.end_time),
    field_name: String(getRowValue(raw, ["field", "court", "field name"]) || raw.field_name || "").trim(),
    location: String(getRowValue(raw, ["location", "venue", "site"]) || raw.location || "").trim(),
    status: raw.status || "upcoming",
    home_score: Number(raw.home_score || 0),
    away_score: Number(raw.away_score || 0),
    period_label: raw.period_label || "",
    period_number: raw.period_number ? Number(raw.period_number) : null,
    clock_display: raw.clock_display || "",
    notes: String(getRowValue(raw, ["notes", "note"]) || raw.notes || "").trim(),
    source_import_id: sourceImportId,
    sort_order: index,
  };
  game.game_title = buildGameTitle(game);
  game.source_row_key = raw.source_row_key || buildSourceRowKey(game);
  return game;
};

export const sortLeagueGames = (games = []) => [...games].sort((a, b) => {
  const dateCompare = String(a.game_date || "").localeCompare(String(b.game_date || ""));
  if (dateCompare) return dateCompare;
  const timeCompare = String(a.start_time || "").localeCompare(String(b.start_time || ""));
  if (timeCompare) return timeCompare;
  return String(a.division || a.age_group || "").localeCompare(String(b.division || b.age_group || ""));
});

export const formatGameTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "TBD";
export const formatGameDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" }) : "TBD";