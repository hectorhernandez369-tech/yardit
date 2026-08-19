import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, CheckCircle2 } from "lucide-react";
import AcceptedTeamAssignmentCard from "@/components/league/AcceptedTeamAssignmentCard";

export default function AcceptedLeagueTeams({ account }) {
  const { data: acceptedTeams = [] } = useQuery({ queryKey: ["acceptedLeagueTeams", account?.id], queryFn: () => base44.entities.LeagueJoinRequest.filter({ league_account_id: account.id, status: "approved" }, "organization_name"), enabled: !!account?.id });
  const { data: teams = [], refetch: refetchTeams } = useQuery({ queryKey: ["leagueTeams", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }, "team_name"), enabled: !!account?.id });
  const { data: games = [], refetch: refetchGames } = useQuery({ queryKey: ["acceptedScheduleTeams", account?.id], queryFn: () => base44.entities.LeagueGame.filter({ vendor_account_id: account.id }), enabled: !!account?.id });
  const teamOptions = useMemo(() => {
    const officialByName = new Map();
    teams.forEach((team) => {
      const normalized = String(team.team_name || "").trim().toLowerCase();
      if (normalized && !officialByName.has(normalized)) officialByName.set(normalized, { ...team, option_id: team.id, imported_name: team.team_name, source: "official" });
    });
    const options = [...officialByName.values()];
    const officialNames = new Set(officialByName.keys());
    const scheduleNames = new Map();
    games.forEach((game) => [[game.home_team, game.home_team_id, game.home_town], [game.away_team, game.away_team_id, game.away_town]].forEach(([name, id, town]) => {
      const normalized = String(name || "").trim().toLowerCase();
      if (normalized && !id && !officialNames.has(normalized) && !scheduleNames.has(normalized)) scheduleNames.set(normalized, { option_id: `schedule:${normalized}`, team_name: String(name).trim(), imported_name: String(name).trim(), town_name: town || "", division: game.division || game.age_group || "", season: game.season || "", sport: account?.business_category || "", source: "schedule" });
    }));
    return [...options, ...scheduleNames.values()];
  }, [teams, games, account?.business_category]);
  const { data: assignments = [], refetch: refetchAssignments } = useQuery({ queryKey: ["acceptedTeamAssignments", account?.id], queryFn: () => base44.entities.LeagueTeamAssignment.filter({ league_account_id: account.id, is_active: true }), enabled: !!account?.id });
  const { data: memberships = [], refetch: refetchMemberships } = useQuery({ queryKey: ["acceptedTeamMemberships", account?.id], queryFn: () => base44.entities.LeagueMembership.filter({ league_account_id: account.id, status: "active" }), enabled: !!account?.id });
  const refresh = () => { refetchTeams(); refetchGames(); refetchAssignments(); refetchMemberships(); };
  const connectedCount = acceptedTeams.filter((request) => assignments.some((item) => item.team_account_id === request.requesting_account_id && item.is_active)).length;
  const waitingCount = Math.max(acceptedTeams.length - connectedCount, 0);

  return <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
    <CardHeader className="space-y-2">
      <CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><Link2 className="h-5 w-5" /> Teams Waiting to Connect</CardTitle>
      <div className="flex flex-wrap gap-2"><Badge variant="secondary">{waitingCount} waiting</Badge><Badge className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" /> {connectedCount} connected</Badge></div>
      <p className="text-sm text-slate-600">When a team joins your league, connect its Yardit account to the official team already in your schedule. That gives the team access to the correct games and score tools.</p>
    </CardHeader>
    <CardContent>{acceptedTeams.length === 0 ? <p className="text-sm text-slate-600">No approved team accounts are waiting to connect.</p> : <div className="grid gap-3 md:grid-cols-2">{acceptedTeams.map((request) => <AcceptedTeamAssignmentCard key={request.id} request={request} account={account} teams={teamOptions} games={games} assignments={assignments} memberships={memberships} onAssigned={refresh} />)}</div>}</CardContent>
  </Card>;
}
