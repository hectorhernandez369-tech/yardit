import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrganizerScoresTab from "@/components/league/scoreboard/OrganizerScoresTab";
import LeagueStandingsTab from "@/components/league/scoreboard/LeagueStandingsTab";
import { hasRecordedScore } from "@/components/league/scoreboard/leagueScoreboardUtils";

export default function OrganizerLeagueScoreboard({ account, games = [], onRefresh }) {
  const syncingIds = useRef(new Set());
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pastGames = games.filter((game) => ["upcoming", "pending", "final"].includes(game.status || "upcoming") && game.game_date && game.game_date < today && !syncingIds.current.has(game.id));
    const statusUpdates = pastGames
      .map((game) => ({ game, status: hasRecordedScore(game) ? "final" : "pending" }))
      .filter(({ game, status }) => (game.status || "upcoming") !== status);
    if (!statusUpdates.length) return;
    statusUpdates.forEach(({ game }) => syncingIds.current.add(game.id));
    Promise.all(statusUpdates.map(({ game, status }) => base44.functions.invoke("leagueGameAction", { action: "update_game", league_game_id: game.id, actor_account_id: account.id, actor_account_name: account.business_name, updates: { status } }))).then(() => onRefresh?.());
  }, [account.id, account.business_name, games, onRefresh]);
  return <div className="space-y-4"><Card className="rounded-2xl bg-white"><CardContent className="p-5"><h2 className="text-2xl font-black text-[#2C4F4E]">League Scoreboard</h2><p className="text-sm text-slate-600">Scores and standings use the same games as the League Master Schedule.</p></CardContent></Card><Tabs defaultValue="scores"><TabsList className="grid w-full grid-cols-2 bg-[#E7D7B8]"><TabsTrigger value="scores">Scores</TabsTrigger><TabsTrigger value="standings">Standings</TabsTrigger></TabsList><TabsContent value="scores" className="mt-4"><OrganizerScoresTab account={account} games={games} onRefresh={onRefresh} /></TabsContent><TabsContent value="standings" className="mt-4"><LeagueStandingsTab games={games} /></TabsContent></Tabs></div>;
}