import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LEAGUE_GAME_STATUSES, formatGameDate, formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";
import { canEditLeagueGameScore, canUnlockLeagueGameScore, membershipPermissions } from "@/lib/leaguePermissions";

const today = new Date().toISOString().slice(0, 10);

export default function LeagueScoreboard({ account, user, games = [], assignments = [], memberships = [], isOwner = false, onRefresh }) {
  const [selectedGameId, setSelectedGameId] = useState("");
  const selectedGame = games.find((game) => game.id === selectedGameId) || null;
  const permissions = useMemo(() => membershipPermissions(memberships), [memberships]);
  const groups = useMemo(() => ({
    live: sortLeagueGames(games.filter((game) => ["live", "halftime", "delayed"].includes(game.status))),
    today: sortLeagueGames(games.filter((game) => game.game_date === today)),
    upcoming: sortLeagueGames(games.filter((game) => game.game_date > today && game.status !== "final")),
    finished: sortLeagueGames(games.filter((game) => game.status === "final")).slice(-10).reverse(),
  }), [games]);

  const canScoreSelected = selectedGame && canEditLeagueGameScore({ isOwner, permissions, assignments, gamePermissions: [], game: selectedGame });
  const canUnlockSelected = selectedGame && canUnlockLeagueGameScore({ isOwner, permissions, gamePermissions: [] });
  const isLocked = selectedGame?.score_state === "locked";

  const updateGame = async (field, value) => {
    if (!selectedGame) return;
    try {
      const nextValue = ["home_score", "away_score", "period_number"].includes(field) ? Number(value || 0) : value;
      const response = await base44.functions.invoke("leagueGameAction", { action: "update_game", league_game_id: selectedGame.id, actor_account_id: account.id, actor_account_name: account.business_name, updates: { [field]: nextValue } });
      if (response?.data?.error) return toast.error(response.data.error);
      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Could not update score.");
    }
  };

  const submitFinalScore = async () => {
    if (!selectedGame) return;
    if (!window.confirm("Submit Final Score? Only the league owner or someone granted unlock_scores can change it afterward.")) return;
    try {
      const response = await base44.functions.invoke("leagueGameAction", { action: "submit_final_score", league_game_id: selectedGame.id, actor_account_id: account.id, actor_account_name: account.business_name, updates: { home_score: Number(selectedGame.home_score || 0), away_score: Number(selectedGame.away_score || 0), status: "final" } });
      if (response?.data?.error) return toast.error(response.data.error);
      toast.success("Final score submitted and locked.");
      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Could not submit final score.");
    }
  };

  const unlockScore = async () => {
    const reason = window.prompt("Reason for unlocking/correcting this score:");
    if (!reason) return;
    try {
      const response = await base44.functions.invoke("leagueGameAction", { action: "unlock_score", league_game_id: selectedGame.id, actor_account_id: account.id, actor_account_name: account.business_name, reason });
      if (response?.data?.error) return toast.error(response.data.error);
      toast.success("Score unlocked.");
      onRefresh?.();
    } catch (error) {
      toast.error(error.message || "Could not unlock score.");
    }
  };

  const renderList = (title, list) => <Card className="rounded-2xl bg-white"><CardContent className="p-4 space-y-3"><h3 className="font-black text-[#2C4F4E]">{title}</h3>{list.length === 0 ? <p className="text-sm text-slate-500">No games.</p> : list.map((game) => <button key={game.id} onClick={() => setSelectedGameId(game.id)} className="w-full rounded-xl border p-3 text-left hover:bg-[#FBFAF7]"><div className="flex items-center justify-between gap-2"><p className="font-bold text-[#2C4F4E]">{game.home_team || "Home"} vs {game.away_team || "Away"}</p><Badge className="capitalize bg-[#5DADA5] text-white">{game.score_state === "locked" ? "locked" : game.status || "upcoming"}</Badge></div><p className="text-xs text-slate-600">{formatGameDate(game.game_date)} · {formatGameTime(game.start_time)} · {game.field_name || game.location || "Field TBD"}</p><p className="text-sm font-black">{Number(game.home_score || 0)} - {Number(game.away_score || 0)}</p></button>)}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl bg-white"><CardContent className="p-5"><h2 className="text-2xl font-black text-[#2C4F4E]">Scoreboard</h2><p className="text-sm text-slate-600">Scores update the same LeagueGame record used by Schedule Manager, team schedules, attached events, and public event pages.</p></CardContent></Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]"><div className="grid gap-4 md:grid-cols-2">{renderList("Live Games", groups.live)}{renderList("Today’s Games", groups.today)}{renderList("Upcoming Games", groups.upcoming)}{renderList("Recently Finished Games", groups.finished)}</div><Card className="rounded-2xl bg-white"><CardContent className="p-4 space-y-3"><h3 className="font-black text-[#2C4F4E]">Update Selected Game</h3>{!selectedGame ? <p className="text-sm text-slate-500">Select a game from any list.</p> : <><p className="font-bold">{selectedGame.home_team} vs {selectedGame.away_team}</p>{isLocked && <Badge className="w-fit bg-slate-800 text-white">Final score locked</Badge>}<div className="grid grid-cols-2 gap-2"><Input disabled={!canScoreSelected || isLocked} type="number" value={selectedGame.home_score || 0} onChange={(e) => updateGame("home_score", e.target.value)} placeholder="Home score" /><Input disabled={!canScoreSelected || isLocked} type="number" value={selectedGame.away_score || 0} onChange={(e) => updateGame("away_score", e.target.value)} placeholder="Away score" /></div><Select disabled={!canScoreSelected || isLocked} value={selectedGame.status || "upcoming"} onValueChange={(value) => updateGame("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><Input disabled={!canScoreSelected || isLocked} value={selectedGame.period_label || ""} onChange={(e) => updateGame("period_label", e.target.value)} placeholder="Quarter, period, or inning label" /><Input disabled={!canScoreSelected || isLocked} type="number" value={selectedGame.period_number || ""} onChange={(e) => updateGame("period_number", e.target.value)} placeholder="Period number" /><Input disabled={!canScoreSelected || isLocked} value={selectedGame.clock_display || ""} onChange={(e) => updateGame("clock_display", e.target.value)} placeholder="Clock display, e.g. 03:12" />{canScoreSelected && !isLocked && <Button className="w-full bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]" onClick={submitFinalScore}>Submit Final Score & Lock</Button>}{isLocked && canUnlockSelected && <Button variant="outline" className="w-full" onClick={unlockScore}>Unlock / Correct Score</Button>}</>}</CardContent></Card></div>
    </div>
  );
}