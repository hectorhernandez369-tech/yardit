import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";

export default function LeagueGameScheduleSection({ games = [], title = "Game Schedule" }) {
  const sortedGames = sortLeagueGames(games).filter(Boolean);
  if (!sortedGames.length) return null;

  return (
    <Card className="rounded-3xl bg-white">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <h2 className="text-2xl font-black text-[#2C4F4E]">{title}</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#2C4F4E]/10">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-[#E7D7B8] text-[#2C4F4E]"><tr>{["Division", "Matchup", "Time", "Field", "Status", "Score", "Period", "Clock"].map((heading) => <th key={heading} className="p-3 text-left font-black">{heading}</th>)}</tr></thead>
            <tbody>{sortedGames.map((game) => <tr key={game.id} className="border-t bg-white"><td className="p-3">{game.division || game.age_group || "General"}</td><td className="p-3 font-bold text-[#2C4F4E]">{game.home_team || "Home"} vs {game.away_team || "Away"}</td><td className="p-3">{formatGameTime(game.start_time)}</td><td className="p-3">{game.field_name || game.location || "TBD"}</td><td className="p-3"><Badge className="capitalize bg-[#5DADA5] text-white">{game.status || "upcoming"}</Badge></td><td className="p-3 font-black">{Number(game.home_score || 0)} - {Number(game.away_score || 0)}</td><td className="p-3">{game.period_label || (game.period_number ? `Period ${game.period_number}` : "")}</td><td className="p-3">{game.clock_display || ""}</td></tr>)}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}