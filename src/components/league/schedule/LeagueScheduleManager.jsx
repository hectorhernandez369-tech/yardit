import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import LeagueScheduleImporter from "./LeagueScheduleImporter";
import LeagueGamesTable from "./LeagueGamesTable";

export default function LeagueScheduleManager({ account, games = [], onRefresh }) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5 space-y-2">
          <h2 className="flex items-center gap-2 text-2xl font-black text-[#2C4F4E]"><Trophy className="h-5 w-5" /> Schedule Manager</h2>
          <p className="text-sm text-slate-600">Upload a full league schedule, search for a town or team like Lindsay, import only those games, then manage every game from this single schedule list.</p>
        </CardContent>
      </Card>
      <LeagueScheduleImporter account={account} existingGames={games} onImported={onRefresh} />
      <LeagueGamesTable account={account} games={games} onRefresh={onRefresh} />
    </div>
  );
}