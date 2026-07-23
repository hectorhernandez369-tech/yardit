const getTime = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
};

const getFieldName = (item) => String(item?.field_name || item?.location || "Main Event").trim() || "Main Event";

export function getLinkedLeagueGames({ leagueEventLinks = [], leagueGames = [] }) {
  if (!Array.isArray(leagueEventLinks) || !Array.isArray(leagueGames)) return [];

  const linkByGameId = new Map(
    leagueEventLinks
      .filter((link) => link?.league_game_id && link?.is_visible !== false)
      .map((link) => [link.league_game_id, link])
  );

  return leagueGames
    .filter((game) => linkByGameId.has(game?.id))
    .map((game) => {
      const link = linkByGameId.get(game.id);
      return {
        ...game,
        schedule_item_type: "league_game",
        spot_id: link?.spot_id || game?.spot_id || "",
        field_name: link?.field_name || game?.field_name || game?.location || "Main Event",
        display_order: link?.display_order ?? game?.sort_order ?? 0,
      };
    });
}

export function getUnifiedEventSchedule({ leagueEventLinks = [], leagueGames = [], scheduleEntries = [] }) {
  const linkedGames = getLinkedLeagueGames({ leagueEventLinks, leagueGames });

  const eventEntries = Array.isArray(scheduleEntries)
    ? scheduleEntries
        .filter((entry) => entry?.title && entry?.start_time)
        .map((entry) => ({ ...entry, schedule_item_type: "event_entry", field_name: entry.field_name || "Main Event" }))
    : [];

  const items = [...linkedGames, ...eventEntries].sort((a, b) => {
    const fieldCompare = getFieldName(a).toLowerCase().localeCompare(getFieldName(b).toLowerCase(), undefined, { numeric: true, sensitivity: "base" });
    if (fieldCompare !== 0) return fieldCompare;
    const timeCompare = getTime(a.start_time) - getTime(b.start_time);
    if (timeCompare !== 0) return timeCompare;
    return Number(a.display_order ?? a.sort_order ?? 0) - Number(b.display_order ?? b.sort_order ?? 0);
  });

  return { type: "mixed", items };
}

export function buildUnifiedSchedulePreview({ leagueEventLinks = [], leagueGames = [], scheduleEntries = [], limit = 4 }) {
  const schedule = getUnifiedEventSchedule({ leagueEventLinks, leagueGames, scheduleEntries });
  return { ...schedule, items: schedule.items.slice(0, limit) };
}