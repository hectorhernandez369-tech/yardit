import { sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";

const normalize = (value) => String(value || "").trim().toLowerCase();
const divisionOf = (game) => String(game.division || game.age_group || "").trim();
export const hasRecordedScore = (game) => {
  const scoreState = normalize(game?.score_state);
  if (["submitted", "locked"].includes(scoreState) || game?.score_submitted_at || game?.score_locked_at) return true;

  const hasNumericScores = game?.home_score !== null && game?.home_score !== undefined && game?.home_score !== "" &&
    game?.away_score !== null && game?.away_score !== undefined && game?.away_score !== "" &&
    Number.isFinite(Number(game.home_score)) && Number.isFinite(Number(game.away_score));

  // Imported games default to 0-0, so treat only a non-zero pair as score evidence
  // unless score submission metadata says the score was actually entered.
  return hasNumericScores && (Number(game.home_score) !== 0 || Number(game.away_score) !== 0);
};

export const effectiveGameStatus = (game) => {
  const status = game?.status || "upcoming";
  const today = new Date().toISOString().slice(0, 10);
  const isPastScheduledGame = game?.game_date && game.game_date < today && ["upcoming", "pending", "final"].includes(status);
  if (!isPastScheduledGame) return status;
  return hasRecordedScore(game) ? "final" : "pending";
};
const explicitWeek = (game) => {
  const value = String(game.week || "").trim();
  if (value) return value.replace(/^week\s*/i, "");
  const match = String(game.notes || "").trim().match(/^(?:week|wk)\s*([\w-]+)/i);
  return match?.[1] || "";
};
const mondayOf = (dateText) => {
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(12, 0, 0, 0);
  return date;
};

export function groupGamesByWeek(games = []) {
  const sorted = sortLeagueGames(games);
  const dated = sorted.filter((game) => mondayOf(game.game_date));
  const usesExplicitWeeks = sorted.length > 0 && sorted.every((game) => explicitWeek(game));
  const firstMonday = dated.length ? mondayOf(dated[0].game_date) : null;
  const groups = new Map();
  sorted.forEach((game) => {
    const explicit = usesExplicitWeeks ? explicitWeek(game) : "";
    const monday = mondayOf(game.game_date);
    const number = explicit || (monday && firstMonday ? Math.floor((monday - firstMonday) / 604800000) + 1 : "");
    const label = number ? `Week ${number}` : "Unscheduled";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(game);
  });
  return [...groups].map(([label, weekGames]) => ({ label, games: sortLeagueGames(weekGames) })).sort((a, b) => {
    if (a.label === "Unscheduled") return 1;
    if (b.label === "Unscheduled") return -1;
    return String(a.label).localeCompare(String(b.label), undefined, { numeric: true });
  });
}

export function calculateStandings(games = []) {
  const hasDivisions = games.some((game) => divisionOf(game));
  const groups = new Map();
  const groupName = (game) => hasDivisions ? divisionOf(game) || "Unassigned Division" : "Overall League";
  const ensureTeam = (group, id, name) => {
    if (!String(name || "").trim()) return null;
    const key = id ? `id:${id}` : `name:${normalize(name)}`;
    if (!group.has(key)) group.set(key, { team: String(name).trim(), wins: 0, losses: 0, ties: 0 });
    return group.get(key);
  };
  games.forEach((game) => {
    const name = groupName(game);
    if (!groups.has(name)) groups.set(name, new Map());
    const group = groups.get(name);
    const home = ensureTeam(group, game.home_team_id, game.home_team);
    const away = ensureTeam(group, game.away_team_id, game.away_team);
    const validScores = game.home_score !== null && game.home_score !== undefined && game.home_score !== "" && game.away_score !== null && game.away_score !== undefined && game.away_score !== "" && Number.isFinite(Number(game.home_score)) && Number.isFinite(Number(game.away_score));
    if (effectiveGameStatus(game) !== "final" || !validScores || !home || !away) return;
    const homeScore = Number(game.home_score); const awayScore = Number(game.away_score);
    if (homeScore > awayScore) { home.wins += 1; away.losses += 1; }
    else if (awayScore > homeScore) { away.wins += 1; home.losses += 1; }
    else { home.ties += 1; away.ties += 1; }
  });
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([division, teams]) => ({ division, teams: [...teams.values()].map((team) => { const played = team.wins + team.losses + team.ties; return { ...team, winPercentage: played ? (team.wins + 0.5 * team.ties) / played : 0 }; }).sort((a, b) => b.winPercentage - a.winPercentage || b.wins - a.wins || a.team.localeCompare(b.team)) }));
}