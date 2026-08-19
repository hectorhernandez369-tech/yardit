import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ROLE_PRESETS } from "@/lib/leaguePermissions";

const normalize = (value) => String(value || "").trim().toLowerCase();

export default function AcceptedTeamAssignmentCard({ request, account, teams, games, assignments, memberships, onAssigned }) {
  const assigned = assignments.filter((item) => item.team_account_id === request.requesting_account_id && item.is_active);
  const [teamId, setTeamId] = useState("");
  const suggested = useMemo(() => {
    const organization = normalize(request.organization_name);
    if (!organization) return null;
    return teams.find((team) => {
      const name = normalize(team.team_name);
      return name === organization || name.includes(organization) || organization.includes(name);
    }) || null;
  }, [request.organization_name, teams]);

  const assignTeam = async (selectedOptionId = teamId) => {
    const option = teams.find((item) => item.option_id === selectedOptionId);
    if (!option) return toast.error("Choose a team.");
    const team = option.id ? option : await base44.entities.LeagueTeam.create({ league_account_id: account.id, team_name: option.team_name, town_name: option.town_name, division: option.division, season: option.season, sport: option.sport, is_active: true });
    const conflict = assignments.some((item) => item.team_id === team.id && item.is_active && item.team_account_id !== request.requesting_account_id);
    if (conflict) return toast.error("That team is already connected to another Yardit team account.");
    const normalized = normalize(option.imported_name || team.team_name);
    const gameUpdates = games.flatMap((game) => {
      const patch = { id: game.id };
      if (normalize(game.home_team) === normalized && game.home_team_id !== team.id) patch.home_team_id = team.id;
      if (normalize(game.away_team) === normalized && game.away_team_id !== team.id) patch.away_team_id = team.id;
      return Object.keys(patch).length > 1 ? [patch] : [];
    });
    if (gameUpdates.length) await base44.entities.LeagueGame.bulkUpdate(gameUpdates);
    if (!assigned.some((item) => item.team_id === team.id)) {
      await base44.entities.LeagueTeamAssignment.create({ league_account_id: account.id, team_account_id: request.requesting_account_id, team_id: team.id, team_name: team.team_name, town_name: team.town_name, division: team.division, season: team.season, can_edit_assigned_games: false, can_submit_scores: true, is_active: true });
    }
    const memberRows = memberships.filter((item) => item.member_account_id === request.requesting_account_id && item.status === "active");
    if (memberRows.length) await base44.entities.LeagueMembership.bulkUpdate(memberRows.map((item) => ({ id: item.id, role: "Team Manager", permissions: ROLE_PRESETS["Team Manager"] })));
    setTeamId("");
    toast.success(`${team.team_name} connected. This team account now has access to its games and score tools.`);
    onAssigned?.();
  };

  return <div className="rounded-xl border p-4 text-sm space-y-3">
    <div><p className="font-bold text-[#2C4F4E]">{request.organization_name}</p><p className="text-xs text-slate-500">{request.requesting_email}</p></div>
    {assigned.length ? <div className="flex flex-wrap gap-1">{assigned.map((item) => <Badge key={item.id} className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" /> Connected to {item.team_name}</Badge>)}</div> : <>
      {suggested && <div className="rounded-xl border border-[#F4A849]/50 bg-[#FFF7E8] p-3"><p className="flex items-center gap-1 font-semibold text-[#2C4F4E]"><Sparkles className="h-4 w-4" /> Yardit found a likely match</p><p className="mt-1 text-sm">We found <strong>{suggested.team_name}</strong> in your league teams{suggested.division ? ` (${suggested.division})` : ""}.</p><Button size="sm" onClick={() => assignTeam(suggested.option_id)} className="mt-2 bg-[#006168] text-white hover:bg-[#004f55]">Connect to {suggested.team_name}</Button></div>}
      <div><p className="mb-1 text-xs font-semibold text-slate-600">Choose a different team</p><div className="flex flex-col gap-2 sm:flex-row"><Select value={teamId} onValueChange={setTeamId}><SelectTrigger><SelectValue placeholder="Select league team" /></SelectTrigger><SelectContent>{teams.map((team) => <SelectItem key={team.option_id} value={team.option_id}>{team.team_name}{team.division ? ` · ${team.division}` : ""}{team.source === "schedule" ? " · Found in schedule" : ""}</SelectItem>)}</SelectContent></Select><Button onClick={() => assignTeam()} disabled={!teamId} className="shrink-0 bg-[#006168] text-white hover:bg-[#004f55]">Connect Team</Button></div></div>
    </>}
  </div>;
}
