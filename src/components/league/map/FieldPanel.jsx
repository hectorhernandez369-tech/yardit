import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Plus, Calendar, ArrowRight } from "lucide-react";
import { formatGameTime, sortLeagueGames } from "@/components/league/schedule/leagueGameUtils";
import { fieldStatusForNow, gamesOnField, conflictsForAssignment, formatConflictMessage } from "@/lib/leagueFieldConflict";

const STATUS_COLOR = {
  upcoming: "bg-slate-100 text-slate-600",
  in_progress: "bg-emerald-100 text-emerald-700",
  between_games: "bg-amber-100 text-amber-700",
  finished: "bg-slate-200 text-slate-500",
  closed: "bg-red-100 text-red-700",
};

// Map field panel: shows a field's status, today's games, unassigned event games, and assign/add actions.
export default function FieldPanel({ field, games = [], eventGames = [], onAssignGame, onAddGame, onOpenSchedule, onClose }) {
  const [assignId, setAssignId] = useState("");
  if (!field) return null;
  const status = fieldStatusForNow(field, games);
  const fieldGames = sortLeagueGames(gamesOnField(field.id, games));
  const unassigned = sortLeagueGames(eventGames.filter((g) => !g.league_event_field_id && g.league_event_id === field.league_event_id));

  const assign = () => {
    const game = eventGames.find((g) => g.id === assignId);
    if (!game) return;
    const conflicts = conflictsForAssignment(game, field.id, games);
    if (conflicts.length) return;
    onAssignGame(game, field);
    setAssignId("");
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-[#2C4F4E]">{field.name}{field.field_number ? ` #${field.field_number}` : ""}</h3>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_COLOR[status]}`}>{status.replace("_", " ")}</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Games on this field</p>
        {fieldGames.length ? (
          <div className="space-y-1">
            {fieldGames.map((g) => (
              <div key={g.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                <p className="font-bold text-slate-700">{formatGameTime(g.start_time)} · {g.home_team || "TBD"} vs {g.away_team || "TBD"}</p>
                <p className="text-slate-500">{g.division || g.age_group || "General"}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-slate-400">No games scheduled on this field yet.</p>}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Assign an unassigned game</p>
        {unassigned.length ? (
          <div className="flex gap-2">
            <Select value={assignId} onValueChange={setAssignId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select game" /></SelectTrigger>
              <SelectContent>
                {unassigned.map((g) => <SelectItem key={g.id} value={g.id}>{formatGameTime(g.start_time)} · {g.home_team || "TBD"} vs {g.away_team || "TBD"}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={assign} disabled={!assignId} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]"><ArrowRight className="h-4 w-4" /></Button>
          </div>
        ) : <p className="text-xs text-slate-400">No unassigned games for this event.</p>}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onAddGame} className="flex-1"><Plus className="h-4 w-4" /> Add Game</Button>
        <Button size="sm" variant="outline" onClick={onOpenSchedule} className="flex-1"><Calendar className="h-4 w-4" /> Schedule Manager</Button>
      </div>
    </div>
  );
}