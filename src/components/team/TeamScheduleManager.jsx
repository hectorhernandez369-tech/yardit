import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatGameDate, formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";

const ALL = "__all__";
const normalize = (value) => String(value || "").trim().toLowerCase();
const unique = (items) => [...new Set(items.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

export default function TeamScheduleManager({ account, user, section = "all" }) {
  const [leagueFilter, setLeagueFilter] = useState(ALL);
  const [teamFilter, setTeamFilter] = useState(ALL);
  const [divisionFilter, setDivisionFilter] = useState(ALL);

  const { data: memberships = [], refetch: refetchMemberships } = useQuery({
    queryKey: ["teamAcceptedLeagues", account?.id],
    queryFn: () => base44.entities.LeagueMembership.filter({ member_account_id: account.id, status: "active" }).catch(() => []),
    enabled: !!account?.id,
  });

  const leagueIds = useMemo(() => unique(memberships.map((m) => m.league_account_id)), [memberships]);

  const { data: leagues = [] } = useQuery({
    queryKey: ["teamAcceptedLeagueAccounts", leagueIds.join("|")],
    queryFn: async () => {
      const batches = await Promise.all(leagueIds.map((id) => base44.entities.VendorAccount.filter({ id }).catch(() => [])));
      return batches.flat();
    },
    enabled: leagueIds.length > 0,
  });

  const { data: leagueGames = [], refetch: refetchLeagueGames } = useQuery({
    queryKey: ["teamAcceptedLeagueGames", leagueIds.join("|")],
    queryFn: async () => {
      const batches = await Promise.all(leagueIds.map((id) => base44.entities.LeagueGame.filter({ vendor_account_id: id }, "sort_order").catch(() => [])));
      return batches.flat();
    },
    enabled: leagueIds.length > 0,
  });

  const { data: links = [], refetch: refetchLinks } = useQuery({
    queryKey: ["teamScheduleLinks", account?.id],
    queryFn: () => base44.entities.TeamScheduleGameLink.filter({ team_account_id: account.id, is_active: true }, "added_at").catch(() => []),
    enabled: !!account?.id,
  });

  const linkedIds = useMemo(() => new Set(links.map((link) => link.league_game_id)), [links]);
  const myGames = useMemo(() => sortLeagueGames(leagueGames.filter((game) => linkedIds.has(game.id))), [leagueGames, linkedIds]);
  const availableGames = useMemo(() => sortLeagueGames(leagueGames.filter((game) => !linkedIds.has(game.id))), [leagueGames, linkedIds]);
  const teamOptions = useMemo(() => unique(leagueGames.flatMap((game) => [game.home_team, game.away_team])), [leagueGames]);
  const divisionOptions = useMemo(() => unique(leagueGames.map((game) => game.division || game.age_group)), [leagueGames]);

  const filteredAvailableGames = useMemo(() => availableGames.filter((game) => {
    const leagueMatches = leagueFilter === ALL || game.vendor_account_id === leagueFilter;
    const teamMatches = teamFilter === ALL || [game.home_team, game.away_team].some((team) => normalize(team) === normalize(teamFilter));
    const divisionMatches = divisionFilter === ALL || normalize(game.division || game.age_group) === normalize(divisionFilter);
    return leagueMatches && teamMatches && divisionMatches;
  }), [availableGames, leagueFilter, teamFilter, divisionFilter]);

  const addGame = async (game) => {
    const existing = await base44.entities.TeamScheduleGameLink.filter({ team_account_id: account.id, league_game_id: game.id, is_active: true }).catch(() => []);
    if (existing.length) return toast.error("That game is already on My Team Schedule.");
    await base44.entities.TeamScheduleGameLink.create({
      team_account_id: account.id,
      league_account_id: game.vendor_account_id,
      league_game_id: game.id,
      added_by_user_id: user?.id || "",
      added_at: new Date().toISOString(),
      is_active: true,
    });
    toast.success("Game added to My Team Schedule.");
    refetchLinks();
  };

  const removeGame = async (game) => {
    const link = links.find((item) => item.league_game_id === game.id);
    if (!link) return;
    await base44.entities.TeamScheduleGameLink.update(link.id, { is_active: false });
    toast.success("Game removed from My Team Schedule.");
    refetchLinks();
  };

  const addAllFilteredGames = async () => {
    if (!filteredAvailableGames.length) return toast.info("No available games match those filters.");
    await base44.entities.TeamScheduleGameLink.bulkCreate(filteredAvailableGames.map((game) => ({
      team_account_id: account.id,
      league_account_id: game.vendor_account_id,
      league_game_id: game.id,
      added_by_user_id: user?.id || "",
      added_at: new Date().toISOString(),
      is_active: true,
    })));
    toast.success(`${filteredAvailableGames.length} games added to My Team Schedule.`);
    refetchLinks();
  };

  const renderGameRow = (game, action) => {
    const league = leagues.find((item) => item.id === game.vendor_account_id);
    return <tr key={game.id} className="border-t align-top">
      <td className="px-2 py-2 font-semibold">{game.home_team || "TBD"}<div className="text-slate-500 font-normal">vs {game.away_team || "TBD"}</div></td>
      <td className="px-2 py-2">{game.division || game.age_group || "—"}</td>
      <td className="px-2 py-2 whitespace-nowrap">{formatGameDate(game.game_date)}</td>
      <td className="px-2 py-2 whitespace-nowrap">{formatGameTime(game.start_time)}</td>
      <td className="px-2 py-2">{game.field_name || game.location || "—"}</td>
      <td className="px-2 py-2">{league?.business_name || game.league_name || "League"}</td>
      <td className="px-2 py-2"><Badge variant="outline" className="capitalize">{game.status || "upcoming"}</Badge></td>
      <td className="px-2 py-2">{action}</td>
    </tr>;
  };

  return <div className="space-y-4">
    {section !== "add" && <Card className="rounded-2xl bg-white">
      <CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><CalendarDays className="h-5 w-5" /> My Team Schedule</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">These are the league games you chose to keep on this team account. The league's Master Schedule stays the source of truth, so league changes automatically appear here.</p>
        {myGames.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No games added yet. Use “Add Games From My League” in the My League tab.</p> :
          <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[850px] text-xs"><thead className="bg-[#E7D7B8] text-[#2C4F4E]"><tr>{["Matchup","Division","Date","Time","Field","League","Status",""] .map((h) => <th key={h} className="px-2 py-2 text-left font-black">{h}</th>)}</tr></thead><tbody>{myGames.map((game) => renderGameRow(game, <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => removeGame(game)}><Trash2 className="h-3 w-3" /> Remove</Button>))}</tbody></table></div>}
      </CardContent>
    </Card>}

    {section !== "schedule" && <Card className="rounded-2xl bg-white">
      <CardHeader><CardTitle className="text-[#2C4F4E]">Add Games From My League</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {leagueIds.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">This team has not been accepted into a league yet. Use the Leagues tab to request access.</p> : <>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={leagueFilter} onValueChange={setLeagueFilter}><SelectTrigger><SelectValue placeholder="League" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All accepted leagues</SelectItem>{leagues.map((league) => <SelectItem key={league.id} value={league.id}>{league.business_name}</SelectItem>)}</SelectContent></Select>
            <Select value={divisionFilter} onValueChange={setDivisionFilter}><SelectTrigger><SelectValue placeholder="Division" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All divisions</SelectItem>{divisionOptions.map((division) => <SelectItem key={division} value={division}>{division}</SelectItem>)}</SelectContent></Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}><SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All teams</SelectItem>{teamOptions.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Choose a team and keep All divisions, or select one division, then add every matching game at once.</p><Button onClick={addAllFilteredGames} disabled={!filteredAvailableGames.length} className="shrink-0 gap-1 bg-[#006168] text-white hover:bg-[#004f55]"><Plus className="h-4 w-4" /> Add All Matching Games ({filteredAvailableGames.length})</Button></div>
          {filteredAvailableGames.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No available games match those filters.</p> :
            <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[850px] text-xs"><thead className="bg-slate-100 text-[#2C4F4E]"><tr>{["Matchup","Division","Date","Time","Field","League","Status",""] .map((h) => <th key={h} className="px-2 py-2 text-left font-black">{h}</th>)}</tr></thead><tbody>{filteredAvailableGames.map((game) => renderGameRow(game, <Button size="sm" className="h-7 gap-1 bg-[#5DADA5] text-white hover:bg-[#4A9B93] text-xs" onClick={() => addGame(game)}><Plus className="h-3 w-3" /> Add to My Team Schedule</Button>))}</tbody></table></div>}
        </>}
      </CardContent>
    </Card>}
  </div>;
}