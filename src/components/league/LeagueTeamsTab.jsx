import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { toast } from "sonner";
import AcceptedLeagueTeams from "@/components/league/AcceptedLeagueTeams";

export default function LeagueTeamsTab({ account, user }) {
  const [team, setTeam] = useState({ team_name: "", town_name: "", division: "", season: "", sport: account?.business_category || "" });
  const [mapping, setMapping] = useState({ team_id: "", imported_name: "" });
  const { data: teams = [], refetch: refetchTeams } = useQuery({ queryKey: ["leagueTeams", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }, "team_name"), enabled: !!account?.id });
  const { data: mappings = [], refetch: refetchMappings } = useQuery({ queryKey: ["leagueTeamMappings", account?.id], queryFn: () => base44.entities.LeagueTeamNameMapping.filter({ league_account_id: account.id }, "imported_name"), enabled: !!account?.id });

  const addTeam = async () => {
    if (!team.team_name.trim()) return toast.error("Team name is required.");
    await base44.entities.LeagueTeam.create({ ...team, league_account_id: account.id, is_active: true });
    setTeam({ team_name: "", town_name: "", division: "", season: "", sport: account?.business_category || "" });
    toast.success("Official team added.");
    refetchTeams();
  };

  const addMapping = async () => {
    if (!mapping.team_id || !mapping.imported_name.trim()) return toast.error("Choose a team and imported name.");
    await base44.entities.LeagueTeamNameMapping.create({ league_account_id: account.id, team_id: mapping.team_id, imported_name: mapping.imported_name.trim(), normalized_name: mapping.imported_name.trim().toLowerCase(), created_by_user_id: user?.id, created_at: new Date().toISOString() });
    setMapping({ team_id: "", imported_name: "" });
    toast.success("Team name mapping saved for future imports.");
    refetchMappings();
  };

  return (
    <div className="space-y-4">
      <AcceptedLeagueTeams account={account} />
      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Users className="h-5 w-5" /> Official League Teams</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6"><Input placeholder="Team name" value={team.team_name} onChange={(e) => setTeam({ ...team, team_name: e.target.value })} /><Input placeholder="Town" value={team.town_name} onChange={(e) => setTeam({ ...team, town_name: e.target.value })} /><Input placeholder="Division" value={team.division} onChange={(e) => setTeam({ ...team, division: e.target.value })} /><Input placeholder="Season" value={team.season} onChange={(e) => setTeam({ ...team, season: e.target.value })} /><Input placeholder="Sport" value={team.sport} onChange={(e) => setTeam({ ...team, sport: e.target.value })} /><Button onClick={addTeam} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Add Team</Button></div>{teams.length === 0 ? <p className="text-sm text-slate-600">Add official teams so imported names can map to stable team IDs.</p> : <div className="grid gap-2 md:grid-cols-2">{teams.map((item) => <div key={item.id} className="rounded-xl border p-3"><p className="font-bold text-[#2C4F4E]">{item.team_name}</p><p className="text-xs text-slate-600">{item.town_name || "No town"} · {item.division || "No division"} · {item.season || "No season"}</p></div>)}</div>}</CardContent></Card>
      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white"><CardHeader><CardTitle className="text-[#2C4F4E]">Imported Name Mappings</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]"><Select value={mapping.team_id} onValueChange={(team_id) => setMapping({ ...mapping, team_id })}><SelectTrigger><SelectValue placeholder="Official team" /></SelectTrigger><SelectContent>{teams.map((item) => <SelectItem key={item.id} value={item.id}>{item.team_name}</SelectItem>)}</SelectContent></Select><Input placeholder="Imported name, e.g. Lindsay Cardinals or LYFC" value={mapping.imported_name} onChange={(e) => setMapping({ ...mapping, imported_name: e.target.value })} /><Button onClick={addMapping} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Save Mapping</Button></div>{mappings.length === 0 ? <p className="text-sm text-slate-600">Mappings let future imports recognize variations of the same team.</p> : <div className="flex flex-wrap gap-2">{mappings.map((item) => <Badge key={item.id} variant="secondary">{item.imported_name}</Badge>)}</div>}</CardContent></Card>
    </div>
  );
}