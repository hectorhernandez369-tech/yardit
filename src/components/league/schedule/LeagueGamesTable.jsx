import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LEAGUE_GAME_STATUSES, formatGameDate, formatGameTime, normalizeLeagueGame, sortLeagueGames } from "./leagueGameUtils";
import LeagueGameEditModal from "./LeagueGameEditModal";
import { canEditLeagueGameSchedule, canEditLeagueGameScore, membershipPermissions } from "@/lib/leaguePermissions";

const ALL = "__all__";
const BLANK = "__blank__";
const blankGame = { division: "", home_team: "", away_team: "", home_town: "", away_town: "", game_date: "", start_time: "", end_time: "", field_name: "", location: "", status: "upcoming", notes: "" };

const optionValue = (value) => value || BLANK;
const optionLabel = (value, fallback) => value || fallback;
const uniqueSorted = (items) => [...new Set(items.map((item) => item || ""))].sort((a, b) => a.localeCompare(b));

export default function LeagueGamesTable({ account, user, games = [], assignments = [], memberships = [], onRefresh, canManageSchedule = false }) {
  const [manualGame, setManualGame] = useState(blankGame);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [weekFilter, setWeekFilter] = useState(ALL);
  const [teamFilter, setTeamFilter] = useState(ALL);
  const [divisionFilter, setDivisionFilter] = useState(ALL);
  const [selectedGameIds, setSelectedGameIds] = useState([]);

  const permissionList = useMemo(() => membershipPermissions(memberships), [memberships]);
  const sortedGames = useMemo(() => sortLeagueGames(games), [games]);
  const weekOptions = useMemo(() => uniqueSorted(sortedGames.map((game) => game.notes || game.week || "")), [sortedGames]);
  const divisionOptions = useMemo(() => uniqueSorted(sortedGames.map((game) => game.division || game.age_group || "")), [sortedGames]);
  const teamOptions = useMemo(() => uniqueSorted(sortedGames.flatMap((game) => [game.home_team || "", game.away_team || ""])), [sortedGames]);

  const filteredGames = useMemo(() => sortedGames.filter((game) => {
    const week = game.notes || game.week || "";
    const division = game.division || game.age_group || "";
    const teams = [game.home_team || "", game.away_team || ""];
    return (weekFilter === ALL || optionValue(week) === weekFilter) &&
      (divisionFilter === ALL || optionValue(division) === divisionFilter) &&
      (teamFilter === ALL || teams.some((team) => optionValue(team) === teamFilter));
  }), [sortedGames, weekFilter, teamFilter, divisionFilter]);

  const saveManualGame = async () => {
    const game = normalizeLeagueGame(manualGame, account, sortedGames.length, "manual");
    if (!game.game_title) return toast.error("Add teams or a game title first.");
    await base44.entities.LeagueGame.create(game);
    setManualGame(blankGame);
    toast.success("Game added.");
    onRefresh?.();
  };

  const duplicateGame = async (game) => {
    const copy = { ...game, id: undefined, league_event_id: undefined, league_event_field_id: undefined, field_name_snapshot: undefined, game_title: `${game.game_title || "Game"} (Copy)`, source_row_key: `${game.source_row_key || game.id}|copy|${Date.now()}`, sort_order: Date.now() };
    await base44.entities.LeagueGame.create(copy);
    toast.success("Game duplicated.");
    onRefresh?.();
  };

  const updateStatus = async (game, status) => {
    await base44.functions.invoke("leagueGameAction", { action: "update_game", league_game_id: game.id, actor_account_id: account.id, actor_account_name: account.business_name, updates: { status } });
    onRefresh?.();
  };

  const canEditGame = (game) => canManageSchedule || canEditLeagueGameSchedule({ isOwner: false, permissions: permissionList, gamePermissions: [] }) || canEditLeagueGameScore({ isOwner: false, permissions: permissionList, assignments, gamePermissions: [], game });

  const removeGame = async (game) => {
    if (!window.confirm("Delete this game? Attached events will lose this game link.")) return;
    await base44.entities.LeagueGame.delete(game.id);
    setSelectedGameIds((ids) => ids.filter((id) => id !== game.id));
    toast.success("Game deleted.");
    onRefresh?.();
  };

  const filteredGameIds = filteredGames.map((game) => game.id);
  const allFilteredSelected = filteredGameIds.length > 0 && filteredGameIds.every((id) => selectedGameIds.includes(id));
  const toggleGame = (gameId) => setSelectedGameIds((ids) => ids.includes(gameId) ? ids.filter((id) => id !== gameId) : [...ids, gameId]);
  const toggleAllFiltered = () => setSelectedGameIds((ids) => allFilteredSelected ? ids.filter((id) => !filteredGameIds.includes(id)) : [...new Set([...ids, ...filteredGameIds])]);

  const deleteSelectedGames = async () => {
    if (!selectedGameIds.length) return;
    if (!window.confirm(`Delete ${selectedGameIds.length} selected game${selectedGameIds.length === 1 ? "" : "s"}? Attached events will lose these game links.`)) return;
    await base44.entities.LeagueGame.deleteMany({ id: { $in: selectedGameIds }, vendor_account_id: account.id });
    setSelectedGameIds([]);
    toast.success("Selected games deleted.");
    onRefresh?.();
  };

  const form = manualGame;
  const setForm = (field, value) => setManualGame((current) => ({ ...current, [field]: value }));

  return (
    <div className="space-y-4">
      {canManageSchedule && (
        <Card className="rounded-2xl bg-white">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-[#2C4F4E]">Manually Add Game</h3>
                <p className="text-xs text-slate-500">{manualFormOpen ? "Enter the master game details below." : "Collapsed to save space."}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setManualFormOpen((open) => !open)}>{manualFormOpen ? "Close" : "Open"}</Button>
            </div>

            <div className={`${manualFormOpen ? "block" : "hidden"} space-y-3`}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input placeholder="Division / Age Group" value={form.division || ""} onChange={(e) => setForm("division", e.target.value)} />
                <Input placeholder="Home Team" value={form.home_team || ""} onChange={(e) => setForm("home_team", e.target.value)} />
                <Input placeholder="Away Team" value={form.away_team || ""} onChange={(e) => setForm("away_team", e.target.value)} />
                <Input placeholder="Home Town" value={form.home_town || ""} onChange={(e) => setForm("home_town", e.target.value)} />
                <Input placeholder="Away Town" value={form.away_town || ""} onChange={(e) => setForm("away_town", e.target.value)} />
                <Input type="date" value={form.game_date || ""} onChange={(e) => setForm("game_date", e.target.value)} />
                <Input placeholder="Start Time" value={form.start_time?.includes("T") ? formatGameTime(form.start_time) : form.start_time || ""} onChange={(e) => setForm("start_time", e.target.value)} />
                <Input placeholder="End Time" value={form.end_time?.includes("T") ? formatGameTime(form.end_time) : form.end_time || ""} onChange={(e) => setForm("end_time", e.target.value)} />
                <Input placeholder="Scheduled Field / Location" value={form.field_name || ""} onChange={(e) => setForm("field_name", e.target.value)} />
                <Input placeholder="Location" value={form.location || ""} onChange={(e) => setForm("location", e.target.value)} />
                <Select value={form.status || "upcoming"} onValueChange={(value) => setForm("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
                <Input placeholder="Week / Notes" value={form.notes || ""} onChange={(e) => setForm("notes", e.target.value)} />
              </div>
              <p className="text-xs text-slate-500">Attach this game to a Yardit event from the event itself. Event-map field placement is also managed there.</p>
              <Button onClick={saveManualGame} className="gap-2 bg-[#5DADA5] text-white hover:bg-[#4A9B93]"><Plus className="h-4 w-4" /> Add Game</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div>
                <h3 className="font-black text-[#2C4F4E]">Imported & Manual Games</h3>
                <p className="text-xs text-slate-500">Showing {filteredGames.length} of {sortedGames.length} games</p>
              </div>
              {canManageSchedule && sortedGames.length > 0 && <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm font-semibold text-[#2C4F4E]"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="h-4 w-4 accent-[#006168]" /> Select all</label><Button type="button" size="sm" variant="outline" disabled={!selectedGameIds.length} onClick={deleteSelectedGames} className="gap-2 border-red-300 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete{selectedGameIds.length ? ` (${selectedGameIds.length})` : ""}</Button></div>}
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:w-[620px]">
              <Select value={weekFilter} onValueChange={setWeekFilter}><SelectTrigger className="h-9"><SelectValue placeholder="Week" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All weeks</SelectItem>{weekOptions.map((week) => <SelectItem key={optionValue(week)} value={optionValue(week)}>{optionLabel(week, "Unassigned week")}</SelectItem>)}</SelectContent></Select>
              <Select value={teamFilter} onValueChange={setTeamFilter}><SelectTrigger className="h-9"><SelectValue placeholder="Team" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All teams</SelectItem>{teamOptions.map((team) => <SelectItem key={optionValue(team)} value={optionValue(team)}>{optionLabel(team, "Unnamed team")}</SelectItem>)}</SelectContent></Select>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}><SelectTrigger className="h-9"><SelectValue placeholder="Division" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All divisions</SelectItem>{divisionOptions.map((division) => <SelectItem key={optionValue(division)} value={optionValue(division)}>{optionLabel(division, "No division")}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          {sortedGames.length === 0 ? (
            <p className="text-sm text-slate-500">No games yet.</p>
          ) : filteredGames.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No games match those filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[860px] text-xs">
                <thead className="bg-[#E7D7B8] text-[#2C4F4E]"><tr>{canManageSchedule && <th className="px-2 py-2 text-left"><input type="checkbox" aria-label="Select all visible games" checked={allFilteredSelected} onChange={toggleAllFiltered} className="h-4 w-4 accent-[#006168]" /></th>}{["Week", "Div", "Matchup", "Date", "Time", "Schedule Field", "Status", "Score", ""].map((heading) => <th key={heading} className="px-2 py-2 text-left font-black">{heading}</th>)}</tr></thead>
                <tbody>{filteredGames.map((game) => <tr key={game.id} className="border-t align-top">{canManageSchedule && <td className="px-2 py-2"><input type="checkbox" aria-label={`Select ${game.game_title || "game"}`} checked={selectedGameIds.includes(game.id)} onChange={() => toggleGame(game.id)} className="h-4 w-4 accent-[#006168]" /></td>}<td className="px-2 py-2 whitespace-nowrap">{game.notes || ""}</td><td className="px-2 py-2 whitespace-nowrap font-semibold">{game.division || game.age_group}</td><td className="px-2 py-2"><div className="font-bold leading-tight">{game.home_team || "TBD"}</div><div className="text-slate-500 leading-tight">vs {game.away_team || "TBD"}</div></td><td className="px-2 py-2 whitespace-nowrap">{formatGameDate(game.game_date)}</td><td className="px-2 py-2 whitespace-nowrap">{formatGameTime(game.start_time)}</td><td className="px-2 py-2 max-w-[140px] truncate">{game.field_name || game.location || "—"}</td><td className="px-2 py-2">{canManageSchedule ? <Select value={game.status || "upcoming"} onValueChange={(value) => updateStatus(game, value)}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select> : <span className="capitalize">{game.status || "upcoming"}</span>}</td><td className="px-2 py-2 whitespace-nowrap font-bold">{Number(game.home_score || 0)} - {Number(game.away_score || 0)}</td><td className="px-2 py-2"><div className="flex flex-nowrap gap-1">{canEditGame(game) && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setEditingGame(game)}>Edit</Button>}{canManageSchedule && <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => duplicateGame(game)}><Copy className="h-3 w-3" /></Button>}{canManageSchedule && <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => removeGame(game)}><Trash2 className="h-3 w-3 text-red-600" /></Button>}</div></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <LeagueGameEditModal account={account} user={user} game={editingGame} open={!!editingGame} onOpenChange={(open) => !open && setEditingGame(null)} onSaved={onRefresh} />
    </div>
  );
}