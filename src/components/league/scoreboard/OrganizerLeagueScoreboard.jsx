import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrganizerScoresTab from "@/components/league/scoreboard/OrganizerScoresTab";
import LeagueStandingsTab from "@/components/league/scoreboard/LeagueStandingsTab";

export default function OrganizerLeagueScoreboard({ account, games = [], onRefresh }) {
  return <div className="space-y-4"><Card className="rounded-2xl bg-white"><CardContent className="p-5"><h2 className="text-2xl font-black text-[#2C4F4E]">League Scoreboard</h2><p className="text-sm text-slate-600">Scores and standings use the same games as the League Master Schedule.</p></CardContent></Card><Tabs defaultValue="scores"><TabsList className="grid w-full grid-cols-2 bg-[#E7D7B8]"><TabsTrigger value="scores">Scores</TabsTrigger><TabsTrigger value="standings">Standings</TabsTrigger></TabsList><TabsContent value="scores" className="mt-4"><OrganizerScoresTab account={account} games={games} onRefresh={onRefresh} /></TabsContent><TabsContent value="standings" className="mt-4"><LeagueStandingsTab games={games} /></TabsContent></Tabs></div>;
}