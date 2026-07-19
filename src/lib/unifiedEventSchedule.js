export function getLinkedLeagueGames({
  leagueEventLinks = [],
  leagueGames = [],
}) {
  if (!Array.isArray(leagueEventLinks) || !Array.isArray(leagueGames)) {
    return [];
  }

  const linkedGameIds = new Set(
    leagueEventLinks
      .map((link) => link?.league_game_id)
      .filter(Boolean)
  );

  return leagueGames
    .filter((game) => linkedGameIds.has(game?.id))
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = new Date(a?.start_time || 0).getTime();
      const bTime = new Date(b?.start_time || 0).getTime();
      return aTime - bTime;
    });
}

export function getUnifiedEventSchedule({
  leagueEventLinks = [],
  leagueGames = [],
  scheduleEntries = [],
}) {
  const linkedGames = getLinkedLeagueGames({
    leagueEventLinks,
    leagueGames,
  });

  if (linkedGames.length > 0) {
    return {
      type: "league_games",
      items: linkedGames,
    };
  }

  const entries = Array.isArray(scheduleEntries)
    ? [...scheduleEntries]
        .filter((entry) => entry?.title && entry?.start_time)
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime()
        )
    : [];

  return {
    type: "event_entries",
    items: entries,
  };
}

export function buildUnifiedSchedulePreview({
  leagueEventLinks = [],
  leagueGames = [],
  scheduleEntries = [],
  limit = 4,
}) {
  const schedule = getUnifiedEventSchedule({
    leagueEventLinks,
    leagueGames,
    scheduleEntries,
  });

  return {
    ...schedule,
    items: schedule.items.slice(0, limit),
  };
}