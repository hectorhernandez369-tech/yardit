import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import OrganizerScoreGameCard from "@/components/league/scoreboard/OrganizerScoreGameCard";
import { groupGamesByWeek } from "@/components/league/scoreboard/leagueScoreboardUtils";

export default function OrganizerScoresTab({ account, games, onRefresh }) {
  const weeks = useMemo(() => groupGamesByWeek(games), [games]);
  if (!weeks.length) return <Card className="rounded-2xl bg-white"><CardContent className="p-5 text-sm text-slate-500">No league games are available yet.</CardContent></Card>;
  return <div className="space-y-4">{weeks.map((week) => <section key={week.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"><div className="flex items-center justify-between bg-[#E7D7B8] px-4 py-3 text-[#2C4F4E]"><h3 className="text-lg font-black">{week.label}</h3><span className="text-xs font-bold">{week.games.length} game{week.games.length === 1 ? "" : "s"}</span></div><div className="grid gap-3 p-3 lg:grid-cols-2">{week.games.map((game) => <OrganizerScoreGameCard key={game.id} account={account} game={game} onRefresh={onRefresh} />)}</div></section>)}</div>;
}