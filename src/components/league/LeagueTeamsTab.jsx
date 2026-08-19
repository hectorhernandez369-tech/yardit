import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Link2, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import AcceptedLeagueTeams from "@/components/league/AcceptedLeagueTeams";

export default function LeagueTeamsTab({ account, user }) {
  const [team, setTeam] = useState({ team_name: "", town_name: "", division: "", season: "", sport: account?.business_category || "" });
  const [mapping, setMapping] = useState({ team_id: "", imported_name: "" });
  const { data: teams = [], refetch: refetchTeams } = useQuery({ queryKey: ["leagueTeams", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }, "team_name"), enabled: !!account?.id });
  const { data: mappings = [], refetch: refetchMappings } = useQuery({ queryKey: ["leagueTeamMappings", account?.id], queryFn: () => base44.entities.LeagueTeamNameMapping.filter({ league_account_id: account.id }, "imported_name"), enabled: !!account?.id });
  const { data: games = [] } = useQuery({ queryKey: ["leagueTeamGameCounts", account?.id], queryFn: () => base44.entities.LeagueGame.filter({ vendor_account_id: account.id }), enabled: !!account?.id });
  const { data: assignments = [] } = useQuery({ queryKey: ["leagueTeamConnections", account?.id], queryFn: () => base44.entities.LeagueTeamAssignment.filter({ league_account_id: account.id, is_active: true }), enabled: !!account?.id });

  const gameCountByTeam = useMemo(() => {
    const counts = new Map();
    games.forEach((game) => [game.home_team_id, game.away_team_id].filter(Boolean).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    return counts;
  }, [games]);
  const connectedTeamIds = useMemo(() => new Set(assignments.map((item) => item.team_id).filter(Boolean)), [assignments]);

  const addTeam = async () => {
    if (!team.team_name.trim()) return toast.error("Team name is required.");
    await base44.entities.LeagueTeam.create({ ...team, league_account_id: account.id, is_active: true });
    setTeam({ team_name: "", town_name: "", division: "", season: "", sport: account?.business_category || "" });
    toast.success("Team added to the league.");
    refetchTeams();
  };

  const addMapping = async () => {
    if (!mapping.team_id || !mapping.imported_name.trim()) return toast.error("Choose a team and enter the alternate schedule name.");
    const importedName = mapping.imported_name.trim();
    const normalizedName = importedName.toLowerCase();
    await base44.entities.LeagueTeamNameMapping.create({ league_account_id: account.id, team_id: mapping.team_id, imported_name: importedName, normalized_name: normalizedName, created_by_user_id: user?.id, created_at: new Date().toISOString() });
    const updates = games.flatMap((game) => {
      const update = { id: game.id };
      if (String(game.home_team || "").trim().toLowerCase() === normalizedName) update.home_team_id = mapping.team_id;
      if (String(game.away_team || "").trim().toLowerCase() === normalizedName) update.away_team_id = mapping.team_id;
      return Object.keys(update).length > 1 ? [update] : [];
    });
    if (updates.length) await base44.entities.LeagueGame.bulkUpdate(updates);
    setMapping({ team_id: "", imported_name: "" });
    toast.success(updates.length ? `Alternate name saved and ${updates.length} existing games connected.` : "Alternate schedule name saved.");
    refetchMappings();
  };

  return (
    <div className="space-y-4">
      <AcceptedLeagueTeams account={account} />

      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Users className="h-5 w-5" /> League Teams</CardTitle>
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">{teams.length} official teams</Badge><Badge variant="secondary">{games.length} master schedule games</Badge><Badge className="bg-green-100 text-green-800">{connectedTeamIds.size} team accounts connected</Badge></div>
          <p className="text-sm text-slate-600">These are the official teams used by your Master Schedule. A team keeps the same Yardit team identity even when a spreadsheet uses a shortened or alternate name.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-slate-50 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#2C4F4E]"><Plus className="h-4 w-4" /> Add a team manually</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6"><Input placeholder="Team name" value={team.team_name} onChange={(e) => setTeam({ ...team, team_name: e.target.value })} /><Input placeholder="Town" value={team.town_name} onChange={(e) => setTeam({ ...team, town_name: e.target.value })} /><Input placeholder="Division" value={team.division} onChange={(e) => setTeam({ ...team, division: e.target.value })} /><Input placeholder="Season" value={team.season} onChange={(e) => setTeam({ ...team, season: e.target.value })} /><Input placeholder="Sport" value={team.sport} onChange={(e) => setTeam({ ...team, sport: e.target.value })} /><Button onClick={addTeam} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Add Team</Button></div>
          </div>

          {teams.length === 0 ? <p className="text-sm text-slate-600">No official teams yet. Upload a schedule and Yardit can create or match them during import.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{teams.map((item) => <div key={item.id} className="rounded-xl border p-4 space-y-2"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-[#2C4F4E]">{item.team_name}</p><p className="text-xs text-slate-600">{item.town_name || "Town not listed"} · {item.division || "Division not listed"} · {item.season || "Season not listed"}</p></div>{connectedTeamIds.has(item.id) ? <Badge className="bg-green-100 text-green-800">Connected</Badge> : <Badge variant="outline">No team account</Badge>}</div><p className="flex items-center gap-1 text-xs text-slate-500"><Gamepad2 className="h-3.5 w-3.5" /> {gameCountByTeam.get(item.id) || 0} scheduled game{(gameCountByTeam.get(item.id) || 0) === 1 ? "" : "s"}</p></div>)}</div>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
        <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Link2 className="h-5 w-5" /> Alternate Schedule Names</CardTitle><p className="text-sm text-slate-600">Use this only when a schedule calls an existing team something different, such as “LYFC” instead of “Lindsay Cardinals.” Yardit will treat both names as the same team.</p></CardHeader>
        <CardContent className="space-y-4"><div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]"><Select value={mapping.team_id} onValueChange={(team_id) => setMapping({ ...mapping, team_id })}><SelectTrigger><SelectValue placeholder="Official league team" /></SelectTrigger><SelectContent>{teams.map((item) => <SelectItem key={item.id} value={item.id}>{item.team_name}</SelectItem>)}</SelectContent></Select><Input placeholder="Alternate name used on schedule" value={mapping.imported_name} onChange={(e) => setMapping({ ...mapping, imported_name: e.target.value })} /><Button onClick={addMapping} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Save Alternate Name</Button></div>{mappings.length === 0 ? <p className="text-sm text-slate-600">No alternate names saved.</p> : <div className="flex flex-wrap gap-2">{mappings.map((item) => { const official = teams.find((team) => team.id === item.team_id); return <Badge key={item.id} variant="secondary">{item.imported_name} → {official?.team_name || "Official team"}</Badge>; })}</div>}</CardContent>
      </Card>
    </div>
  );
}
