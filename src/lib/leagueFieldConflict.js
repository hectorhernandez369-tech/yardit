// Shared field-to-game conflict validation for League Events.
// Used by Schedule Manager, game editor, map field assignment, bulk scheduling and imports.
// A conflict exists when two active games assigned to the same LeagueEventField have
// overlapping time ranges. This is the single source of truth — do not re-implement elsewhere.

const CANCELLED_STATUSES = new Set(["cancelled"]);

const toMs = (value) => {
  if (!value) return 0;
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
};

export const gameStartMs = (game) => toMs(game?.start_time);
export const gameEndMs = (game) => toMs(game?.end_time) || gameStartMs(game);

export const isGameActive = (game) => !!game && !CANCELLED_STATUSES.has(game.status);

// Two games conflict if they share a field and their [start,end) windows overlap.
export const gamesConflict = (a, b) => {
  if (!a || !b) return false;
  if (!a.league_event_field_id || a.league_event_field_id !== b.league_event_field_id) return false;
  if (!isGameActive(a) || !isGameActive(b)) return false;
  const aStart = gameStartMs(a);
  const aEnd = gameEndMs(a) || aStart;
  const bStart = gameStartMs(b);
  const bEnd = gameEndMs(b) || bStart;
  if (!aStart || !bStart) return false;
  return aStart < bEnd && bStart < aEnd;
};

// All games that would conflict with assigning `game` to `fieldId`.
export const conflictsForAssignment = (game, fieldId, allGames = []) => {
  if (!fieldId) return [];
  const hypothetical = { ...game, league_event_field_id: fieldId };
  return allGames.filter((other) => other?.id !== game?.id && gamesConflict(hypothetical, other));
};

export const canAssignGameToField = (game, field, allGames = []) => {
  if (!field || field.status !== "active" || field.is_active === false) {
    return { ok: false, reason: "This field is not active and cannot host games." };
  }
  if (game?.league_event_id && field.league_event_id && game.league_event_id !== field.league_event_id) {
    return { ok: false, reason: "This field belongs to a different League Event." };
  }
  const conflicts = conflictsForAssignment(game, field.id, allGames);
  if (conflicts.length) {
    return { ok: false, reason: formatConflictMessage(conflicts[0]), conflicts };
  }
  return { ok: true };
};

export const formatConflictMessage = (conflictGame) => {
  const start = conflictGame?.start_time ? new Date(conflictGame.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  const end = conflictGame?.end_time ? new Date(conflictGame.end_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  const matchup = conflictGame?.game_title || [conflictGame?.home_team, conflictGame?.away_team].filter(Boolean).join(" vs ");
  return `Field already has a game scheduled${start ? ` from ${start}${end ? ` to ${end}` : ""}` : ""}${matchup ? ` (${matchup})` : ""}.`;
};

// Field event-day status derived from assigned games and now.
export const FIELD_STATUSES = ["upcoming", "in_progress", "between_games", "finished", "closed"];

export const fieldStatusForNow = (field, games = [], now = Date.now()) => {
  if (field?.status === "closed" || field?.is_active === false) return "closed";
  const fieldGames = games.filter((g) => g.league_event_field_id === field.id && isGameActive(g));
  if (!fieldGames.length) return "upcoming";
  const inProgress = fieldGames.some((g) => {
    const s = gameStartMs(g);
    const e = gameEndMs(g) || s;
    return s && e && now >= s && now < e;
  });
  if (inProgress) return "in_progress";
  const future = fieldGames.filter((g) => gameStartMs(g) > now).sort((a, b) => gameStartMs(a) - gameStartMs(b));
  const past = fieldGames.filter((g) => gameEndMs(g) <= now);
  if (future.length) return "between_games";
  if (past.length && !future.length) return "finished";
  return "upcoming";
};

export const gamesOnField = (fieldId, games = []) => games.filter((g) => g.league_event_field_id === fieldId);