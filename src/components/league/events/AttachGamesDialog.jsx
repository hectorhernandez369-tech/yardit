import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatGameDate, formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";

export default function AttachGamesDialog({ open, onOpenChange, event, account, games = [], existingLinks = [], onAttached }) {
  const [filters, setFilters] = useState({ date: "", team: "", town: "", division: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const linkedIds = new Set(existingLinks.map((link) => link.league_game_id));
  const eventDate = event?.startDateTime ? new Date(event.startDateTime).toISOString().slice(0, 10) : "";

  const filteredGames = useMemo(() => sortLeagueGames(games).filter((game) => {
    const dateOk = !filters.date || game.game_date === filters.date;
    const teamText = `${game.home_team || ""} ${game.away_team || ""}`.toLowerCase();
    const townText = `${game.home_town || ""} ${game.away_town || ""} ${game.location || ""}`.toLowerCase();
    const divisionText = `${game.division || ""} ${game.age_group || ""}`.toLowerCase();
    return dateOk && teamText.includes(filters.team.toLowerCase()) && townText.includes(filters.town.toLowerCase()) && divisionText.includes(filters.division.toLowerCase());
  }), [games, filters]);

  const prioritizedGames = useMemo(() => [...filteredGames].sort((a, b) => Number(b.game_date === eventDate) - Number(a.game_date === eventDate)), [filteredGames, eventDate]);

  const attachSelected = async () => {
    const toAttach = selectedIds.filter((id) => !linkedIds.has(id));
    if (!toAttach.length) return toast.info("No new games selected.");
    await base44.entities.LeagueEventGame.bulkCreate(toAttach.map((id, index) => ({ event_id: event.id, league_game_id: id, league_account_id: account.id, display_order: existingLinks.length + index, is_visible: true })));
    toast.success(`${toAttach.length} games attached.`);
    setSelectedIds([]);
    onAttached?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Import Games from Schedule Manager</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid gap-2 sm:grid-cols-4"><Input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} placeholder="Date" /><Input value={filters.team} onChange={(e) => setFilters({ ...filters, team: e.target.value })} placeholder="Team" /><Input value={filters.town} onChange={(e) => setFilters({ ...filters, town: e.target.value })} placeholder="Town" /><Input value={filters.division} onChange={(e) => setFilters({ ...filters, division: e.target.value })} placeholder="Division" /></div><div className="max-h-[520px] overflow-auto rounded-xl border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["", "Division", "Teams", "Date", "Start", "Field", "Status"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{prioritizedGames.map((game) => { const linked = linkedIds.has(game.id); return <tr key={game.id} className={`border-t ${game.game_date === eventDate ? "bg-[#FFF7E8]" : "bg-white"}`}><td className="p-2"><Checkbox disabled={linked} checked={selectedIds.includes(game.id)} onCheckedChange={(checked) => setSelectedIds((current) => checked ? [...current, game.id] : current.filter((id) => id !== game.id))} /></td><td className="p-2">{game.division || game.age_group}</td><td className="p-2 font-semibold">{game.home_team} vs {game.away_team}</td><td className="p-2">{formatGameDate(game.game_date)}</td><td className="p-2">{formatGameTime(game.start_time)}</td><td className="p-2">{game.field_name || game.location}</td><td className="p-2">{linked ? "Already attached" : game.status}</td></tr>; })}</tbody></table></div><Button onClick={attachSelected} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]">Attach Selected Games</Button></div></DialogContent></Dialog>
  );
}