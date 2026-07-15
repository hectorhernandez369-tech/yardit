import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LEAGUE_GAME_STATUSES, formatGameDate, formatGameTime, normalizeLeagueGame, sortLeagueGames } from "./leagueGameUtils";

const blankGame = { division: "", home_team: "", away_team: "", home_town: "", away_town: "", game_date: "", start_time: "", end_time: "", field_name: "", location: "", status: "upcoming", notes: "" };

export default function LeagueGamesTable({ account, games = [], onRefresh }) {
  const [manualGame, setManualGame] = useState(blankGame);
  const [editingId, setEditingId] = useState("");
  const [editGame, setEditGame] = useState(null);
  const sortedGames = sortLeagueGames(games);

  const saveManualGame = async () => {
    const game = normalizeLeagueGame(manualGame, account, sortedGames.length, "manual");
    if (!game.game_title) return toast.error("Add teams or a game title first.");
    await base44.entities.LeagueGame.create(game);
    setManualGame(blankGame);
    toast.success("Game added.");
    onRefresh?.();
  };

  const saveEdit = async () => {
    const game = normalizeLeagueGame(editGame, account, editGame.sort_order || 0, editGame.source_import_id || "manual");
    await base44.entities.LeagueGame.update(editingId, game);
    setEditingId("");
    setEditGame(null);
    toast.success("Game updated.");
    onRefresh?.();
  };

  const duplicateGame = async (game) => {
    const copy = { ...game, id: undefined, game_title: `${game.game_title || "Game"} (Copy)`, source_row_key: `${game.source_row_key || game.id}|copy|${Date.now()}`, sort_order: Date.now() };
    await base44.entities.LeagueGame.create(copy);
    toast.success("Game duplicated.");
    onRefresh?.();
  };

  const updateStatus = async (game, status) => {
    await base44.entities.LeagueGame.update(game.id, { status });
    onRefresh?.();
  };

  const removeGame = async (game) => {
    if (!window.confirm("Delete this game? Attached events will lose this game link.")) return;
    await base44.entities.LeagueGame.delete(game.id);
    toast.success("Game deleted.");
    onRefresh?.();
  };

  const form = editingId ? editGame : manualGame;
  const setForm = (field, value) => editingId ? setEditGame((current) => ({ ...current, [field]: value })) : setManualGame((current) => ({ ...current, [field]: value }));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl bg-white"><CardContent className="p-4 space-y-3"><h3 className="font-black text-[#2C4F4E]">{editingId ? "Edit Game" : "Manually Add Game"}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Input placeholder="Division / Age Group" value={form?.division || ""} onChange={(e) => setForm("division", e.target.value)} /><Input placeholder="Home Team" value={form?.home_team || ""} onChange={(e) => setForm("home_team", e.target.value)} /><Input placeholder="Away Team" value={form?.away_team || ""} onChange={(e) => setForm("away_team", e.target.value)} /><Input placeholder="Home Town" value={form?.home_town || ""} onChange={(e) => setForm("home_town", e.target.value)} /><Input placeholder="Away Town" value={form?.away_town || ""} onChange={(e) => setForm("away_town", e.target.value)} /><Input type="date" value={form?.game_date || ""} onChange={(e) => setForm("game_date", e.target.value)} /><Input placeholder="Start Time" value={form?.start_time?.includes("T") ? formatGameTime(form.start_time) : form?.start_time || ""} onChange={(e) => setForm("start_time", e.target.value)} /><Input placeholder="End Time" value={form?.end_time?.includes("T") ? formatGameTime(form.end_time) : form?.end_time || ""} onChange={(e) => setForm("end_time", e.target.value)} /><Input placeholder="Field" value={form?.field_name || ""} onChange={(e) => setForm("field_name", e.target.value)} /><Input placeholder="Location" value={form?.location || ""} onChange={(e) => setForm("location", e.target.value)} /><Select value={form?.status || "upcoming"} onValueChange={(value) => setForm("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><Input placeholder="Notes" value={form?.notes || ""} onChange={(e) => setForm("notes", e.target.value)} /></div><div className="flex gap-2"><Button onClick={editingId ? saveEdit : saveManualGame} className="gap-2 bg-[#5DADA5] text-white hover:bg-[#4A9B93]">{editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Save Changes" : "Add Game"}</Button>{editingId && <Button variant="outline" onClick={() => { setEditingId(""); setEditGame(null); }}>Cancel</Button>}</div></CardContent></Card>
      <Card className="rounded-2xl bg-white"><CardContent className="p-4"><h3 className="mb-3 font-black text-[#2C4F4E]">Imported & Manual Games</h3>{sortedGames.length === 0 ? <p className="text-sm text-slate-500">No games yet.</p> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[980px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["Division", "Teams", "Date", "Start", "Field", "Status", "Score", "Actions"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{sortedGames.map((game) => <tr key={game.id} className="border-t"><td className="p-2">{game.division || game.age_group}</td><td className="p-2 font-semibold">{game.home_team} vs {game.away_team}</td><td className="p-2">{formatGameDate(game.game_date)}</td><td className="p-2">{formatGameTime(game.start_time)}</td><td className="p-2">{game.field_name || game.location}</td><td className="p-2"><Select value={game.status || "upcoming"} onValueChange={(value) => updateStatus(game, value)}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></td><td className="p-2 font-bold">{Number(game.home_score || 0)} - {Number(game.away_score || 0)}</td><td className="p-2"><div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => { setEditingId(game.id); setEditGame(game); }}>Edit</Button><Button size="sm" variant="outline" onClick={() => duplicateGame(game)}><Copy className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={() => removeGame(game)}><Trash2 className="h-3 w-3 text-red-600" /></Button></div></td></tr>)}</tbody></table></div>}</CardContent></Card>
    </div>
  );
}