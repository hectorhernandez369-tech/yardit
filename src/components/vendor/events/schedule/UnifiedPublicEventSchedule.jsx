import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { groupScheduleRows } from "@/lib/vendorEventSchedule";
import { getUnifiedEventSchedule } from "@/lib/unifiedEventSchedule";

const timeLabel = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const gameStatusLabel = (game) => {
  const status = String(game?.status || "upcoming").toLowerCase();

  if (status === "final") return "Final";
  if (status === "halftime") return "Halftime";
  if (status === "live") return "Live";

  return timeLabel(game?.start_time);
};

const showGameScore = (game) => {
  const status = String(game?.status || "upcoming").toLowerCase();

  return ["live", "halftime", "final"].includes(status);
};

export default function UnifiedPublicEventSchedule({
  leagueEventLinks = [],
  leagueGames = [],
  scheduleEntries = [],
}) {
  const schedule = getUnifiedEventSchedule({
    leagueEventLinks,
    leagueGames,
    scheduleEntries,
  });

  if (!schedule.items.length) {
    return null;
  }

  if (schedule.type === "league_games") {
    return (
      <Card className="rounded-3xl bg-white">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h2 className="text-2xl font-black text-[#2C4F4E]">
            Schedule
          </h2>

          <div className="space-y-3">
            {schedule.items.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-500">
                      {game.division ||
                        game.age_group ||
                        game.field_name ||
                        "Game"}
                    </p>

                    <p className="font-black text-[#2C4F4E]">
                      {game.home_team || "Home"} vs{" "}
                      {game.away_team || "Away"}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {timeLabel(game.start_time)}
                      {game.field_name
                        ? ` · ${game.field_name}`
                        : game.location
                          ? ` · ${game.location}`
                          : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <Badge className="capitalize bg-[#5DADA5] text-white">
                      {gameStatusLabel(game)}
                    </Badge>

                    {showGameScore(game) && (
                      <p className="mt-2 text-lg font-black text-[#2C4F4E]">
                        {Number(game.home_score || 0)} -{" "}
                        {Number(game.away_score || 0)}
                      </p>
                    )}

                    {(game.period_label ||
                      game.period_number ||
                      game.clock_display) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {game.period_label ||
                          (game.period_number
                            ? `Period ${game.period_number}`
                            : "")}
                        {game.clock_display
                          ? ` · ${game.clock_display}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groups = groupScheduleRows(schedule.items);

  return (
    <Card className="rounded-3xl bg-white">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <h2 className="text-2xl font-black text-[#2C4F4E]">
          Schedule
        </h2>

        {Object.entries(groups).map(([fieldName, rows]) => (
          <div key={fieldName} className="space-y-2">
            <h3 className="rounded-xl bg-[#2C4F4E] px-4 py-2 font-black text-white">
              {fieldName}
            </h3>

            {rows.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3"
              >
                <p className="font-black text-[#2C4F4E]">
                  {entry.title}
                </p>

                <p className="text-sm text-slate-700">
                  {timeLabel(entry.start_time)}
                  {entry.end_time
                    ? ` - ${timeLabel(entry.end_time)}`
                    : ""}
                </p>

                {entry.notes && (
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}