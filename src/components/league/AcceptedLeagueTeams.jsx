import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AcceptedTeamAssignmentCard from "@/components/league/AcceptedTeamAssignmentCard";

export default function AcceptedLeagueTeams({ account }) {
  const { data: acceptedTeams = [] } = useQuery({ queryKey: ["acceptedLeagueTeams", account?.id], queryFn: () => base44.entities.LeagueJoinRequest.filter({ league_account_id: account.id, status: "approved" }, "organization_name"), enabled: !!account?.id });
  const { data: teams = [], refetch: refetchTeams } = useQuery({ queryKey: ["leagueTeams", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }, "team_name"), enabled: !!account?.id });
  const { data: games = [], refetch: refetchGames } = useQuery({ queryKey: ["acceptedScheduleTeams", account?.id], queryFn: () => base44.entities.LeagueGame.filter({ vendor_account_id: account.id }), enabled: !!account?.id });
  const teamOptions = useMemo(() => {
    const options = teams.map((team) => ({ ...team, option_id: team.id, imported_name: team.team_name }));
    const officialNames = new Set(teams.map((team) => String(team.team_name || "").trim().toLowerCase()));
    const scheduleNames = new Map();
    games.forEach((game) => [[game.home_team, game.home_team_id], [game.away_team, game.away_team_id]].forEach(([name, id]) => {
      const normalized = String(name || "").trim().toLowerCase();
      if (normalized && !id && !officialNames.has(normalized) && !scheduleNames.has(normalized)) scheduleNames.set(normalized, { option_id: `schedule:${normalized}`, team_name: String(name).trim(), imported_name: String(name).trim(), town_name: "", division: game.division || game.age_group || "", season: game.season || "", sport: account?.business_category || "" });
    }));
    return [...options, ...scheduleNames.values()];
  }, [teams, games, account?.business_category]);
  const { data: assignments = [], refetch: refetchAssignments } = useQuery({ queryKey: ["acceptedTeamAssignments", account?.id], queryFn: () => base44.entities.LeagueTeamAssignment.filter({ league_account_id: account.id, is_active: true }), enabled: !!account?.id });
  const { data: memberships = [], refetch: refetchMemberships } = useQuery({ queryKey: ["acceptedTeamMemberships", account?.id], queryFn: () => base44.entities.LeagueMembership.filter({ league_account_id: account.id, status: "active" }), enabled: !!account?.id });
  const refresh = () => { refetchTeams(); refetchGames(); refetchAssignments(); refetchMemberships(); };

  return <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
    <CardHeader><CardTitle className="text-[#2C4F4E]">Accepted Teams</CardTitle></CardHeader>
    <CardContent>{acceptedTeams.length === 0 ? <p className="text-sm text-slate-600">No accepted teams yet.</p> : <div className="grid gap-2 md:grid-cols-2">{acceptedTeams.map((request) => <AcceptedTeamAssignmentCard key={request.id} request={request} account={account} teams={teamOptions} games={games} assignments={assignments} memberships={memberships} onAssigned={refresh} />)}</div>}</CardContent>
  </Card>;
}