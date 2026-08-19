import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ROLE_PRESETS } from "@/lib/leaguePermissions";

export default function AcceptedTeamAssignmentCard({ request, account, teams, games, assignments, memberships, onAssigned }) {
  const assigned = assignments.filter((item) => item.team_account_id === request.requesting_account_id && item.is_active);
  const [teamId, setTeamId] = useState("");

  const assignTeam = async () => {
    const option = teams.find((item) => item.option_id === teamId);
    if (!option) return toast.error("Choose a team.");
    const team = option.id ? option : await base44.entities.LeagueTeam.create({ league_account_id: account.id, team_name: option.team_name, town_name: option.town_name, division: option.division, season: option.season, sport: option.sport, is_active: true });
    const conflict = assignments.some((item) => item.team_id === team.id && item.is_active && item.team_account_id !== request.requesting_account_id);
    if (conflict) return toast.error("That official team is assigned to another team account.");
    const normalized = String(option.imported_name || team.team_name).trim().toLowerCase();
    const gameUpdates = games.flatMap((game) => {
      const patch = { id: game.id };
      if (!game.home_team_id && String(game.home_team || "").trim().toLowerCase() === normalized) patch.home_team_id = team.id;
      if (!game.away_team_id && String(game.away_team || "").trim().toLowerCase() === normalized) patch.away_team_id = team.id;
      return Object.keys(patch).length > 1 ? [patch] : [];
    });
    if (gameUpdates.length) await base44.entities.LeagueGame.bulkUpdate(gameUpdates);
    if (!assigned.some((item) => item.team_id === team.id)) {
      await base44.entities.LeagueTeamAssignment.create({ league_account_id: account.id, team_account_id: request.requesting_account_id, team_id: team.id, team_name: team.team_name, town_name: team.town_name, division: team.division, season: team.season, can_edit_assigned_games: false, can_submit_scores: true, is_active: true });
    }
    const memberRows = memberships.filter((item) => item.member_account_id === request.requesting_account_id && item.status === "active");
    if (memberRows.length) await base44.entities.LeagueMembership.bulkUpdate(memberRows.map((item) => ({ id: item.id, role: "Team Manager", permissions: ROLE_PRESETS["Team Manager"] })));
    setTeamId("");
    toast.success(`${team.team_name} assigned with score access.`);
    onAssigned?.();
  };

  return <div className="rounded-xl border p-3 text-sm space-y-3">
    <div><p className="font-bold text-[#2C4F4E]">{request.organization_name}</p><p>{request.requesting_email}</p></div>
    <div className="flex flex-wrap gap-1">{assigned.length ? assigned.map((item) => <Badge key={item.id} className="bg-green-100 text-green-800">{item.team_name} · Score access</Badge>) : <Badge variant="outline">No official team assigned</Badge>}</div>
    <div className="flex flex-col gap-2 sm:flex-row"><Select value={teamId} onValueChange={setTeamId}><SelectTrigger><SelectValue placeholder="Choose official team" /></SelectTrigger><SelectContent>{teams.map((team) => <SelectItem key={team.option_id} value={team.option_id}>{team.team_name} · {team.division || "No division"}</SelectItem>)}</SelectContent></Select><Button onClick={assignTeam} disabled={!teamId} className="shrink-0 bg-[#006168] text-white hover:bg-[#004f55]">Assign Team</Button></div>
  </div>;
}