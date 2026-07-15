import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LEAGUE_GAME_STATUSES, formatGameDate, formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";

const today = new Date().toISOString().slice(0, 10);

export default function LeagueScoreboard({ games = [], onRefresh }) {
  const [selectedGameId, setSelectedGameId] = useState("");
  const selectedGame = games.find((game) => game.id === selectedGameId) || null;
  const groups = useMemo(() => ({
    live: sortLeagueGames(games.filter((game) => ["live", "halftime", "delayed"].includes(game.status))),
    today: sortLeagueGames(games.filter((game) => game.game_date === today)),
    upcoming: sortLeagueGames(games.filter((game) => game.game_date > today && game.status !== "final")),
    finished: sortLeagueGames(games.filter((game) => game.status === "final")).slice(-10).reverse(),
  }), [games]);

  const updateGame = async (field, value) => {
    if (!selectedGame) return;
    await base44.entities.LeagueGame.update(selectedGame.id, { [field]: ["home_score", "away_score", "period_number"].includes(field) ? Number(value || 0) : value });
    onRefresh?.();
  };

  const renderList = (title, list) => <Card className="rounded-2xl bg-white"><CardContent className="p-4 space-y-3"><h3 className="font-black text-[#2C4F4E]">{title}</h3>{list.length === 0 ? <p className="text-sm text-slate-500">No games.</p> : list.map((game) => <button key={game.id} onClick={() => setSelectedGameId(game.id)} className="w-full rounded-xl border p-3 text-left hover:bg-[#FBFAF7]"><div className="flex items-center justify-between gap-2"><p className="font-bold text-[#2C4F4E]">{game.home_team || "Home"} vs {game.away_team || "Away"}</p><Badge className="capitalize bg-[#5DADA5] text-white">{game.status || "upcoming"}</Badge></div><p className="text-xs text-slate-600">{formatGameDate(game.game_date)} · {formatGameTime(game.start_time)} · {game.field_name || game.location || "Field TBD"}</p><p className="text-sm font-black">{Number(game.home_score || 0)} - {Number(game.away_score || 0)}</p></button>)}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl bg-white"><CardContent className="p-5"><h2 className="text-2xl font-black text-[#2C4F4E]">Scoreboard</h2><p className="text-sm text-slate-600">Scores update the same LeagueGame record used by Schedule Manager, attached event dashboards, and public event pages.</p></CardContent></Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]"><div className="grid gap-4 md:grid-cols-2">{renderList("Live Games", groups.live)}{renderList("Today’s Games", groups.today)}{renderList("Upcoming Games", groups.upcoming)}{renderList("Recently Finished Games", groups.finished)}</div><Card className="rounded-2xl bg-white"><CardContent className="p-4 space-y-3"><h3 className="font-black text-[#2C4F4E]">Update Selected Game</h3>{!selectedGame ? <p className="text-sm text-slate-500">Select a game from any list.</p> : <><p className="font-bold">{selectedGame.home_team} vs {selectedGame.away_team}</p><div className="grid grid-cols-2 gap-2"><Input type="number" value={selectedGame.home_score || 0} onChange={(e) => updateGame("home_score", e.target.value)} placeholder="Home score" /><Input type="number" value={selectedGame.away_score || 0} onChange={(e) => updateGame("away_score", e.target.value)} placeholder="Away score" /></div><Select value={selectedGame.status || "upcoming"} onValueChange={(value) => updateGame("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><Input value={selectedGame.period_label || ""} onChange={(e) => updateGame("period_label", e.target.value)} placeholder="Quarter, period, or inning label" /><Input type="number" value={selectedGame.period_number || ""} onChange={(e) => updateGame("period_number", e.target.value)} placeholder="Period number" /><Input value={selectedGame.clock_display || ""} onChange={(e) => updateGame("clock_display", e.target.value)} placeholder="Clock display, e.g. 03:12" /><Button className="w-full bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]" onClick={() => { toast.success("Score saved"); onRefresh?.(); }}>Done</Button></>}</CardContent></Card></div>
    </div>
  );
}