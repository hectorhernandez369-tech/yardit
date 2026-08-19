import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AcceptedTeamAssignmentCard from "@/components/league/AcceptedTeamAssignmentCard";

export default function AcceptedLeagueTeams({ account }) {
  const { data: acceptedTeams = [] } = useQuery({ queryKey: ["acceptedLeagueTeams", account?.id], queryFn: () => base44.entities.LeagueJoinRequest.filter({ league_account_id: account.id, status: "approved" }, "organization_name"), enabled: !!account?.id });
  const { data: teams = [] } = useQuery({ queryKey: ["acceptedOfficialTeams", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }, "team_name"), enabled: !!account?.id });
  const { data: assignments = [], refetch: refetchAssignments } = useQuery({ queryKey: ["acceptedTeamAssignments", account?.id], queryFn: () => base44.entities.LeagueTeamAssignment.filter({ league_account_id: account.id, is_active: true }), enabled: !!account?.id });
  const { data: memberships = [], refetch: refetchMemberships } = useQuery({ queryKey: ["acceptedTeamMemberships", account?.id], queryFn: () => base44.entities.LeagueMembership.filter({ league_account_id: account.id, status: "active" }), enabled: !!account?.id });
  const refresh = () => { refetchAssignments(); refetchMemberships(); };

  return <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
    <CardHeader><CardTitle className="text-[#2C4F4E]">Accepted Teams</CardTitle></CardHeader>
    <CardContent>{acceptedTeams.length === 0 ? <p className="text-sm text-slate-600">No accepted teams yet.</p> : <div className="grid gap-2 md:grid-cols-2">{acceptedTeams.map((request) => <AcceptedTeamAssignmentCard key={request.id} request={request} account={account} teams={teams} assignments={assignments} memberships={memberships} onAssigned={refresh} />)}</div>}</CardContent>
  </Card>;
}