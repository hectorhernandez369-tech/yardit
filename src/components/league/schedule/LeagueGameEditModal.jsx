import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LEAGUE_GAME_STATUSES, formatGameTime, normalizeLeagueGame } from "./leagueGameUtils";
import LeagueFieldSelect from "./LeagueFieldSelect";

const fieldGroups = [
  ["league_name", "League"],
  ["season", "Season"],
  ["division", "Division"],
  ["age_group", "Age Group"],
  ["game_title", "Game Title"],
  ["home_team", "Home Team"],
  ["away_team", "Away Team"],
  ["home_town", "Home Town"],
  ["away_town", "Away Town"],
  ["field_name", "Field"],
  ["location", "Location"],
  ["period_label", "Period Label"],
  ["clock_display", "Clock"],
  ["notes", "Week / Notes"],
];

export default function LeagueGameEditModal({ account, user, game, open, onOpenChange, onSaved, allGames }) {
  const [draft, setDraft] = useState(null);

  const { data: events = [] } = useQuery({ queryKey: ["leagueEventsForGameEdit", account?.id], queryFn: () => base44.entities.VendorEvent.filter({ organizer_business_id: account.id, status: "published" }, "startDateTime"), enabled: !!account?.id, initialData: [] });

  useEffect(() => {
    if (game) setDraft({ ...game });
  }, [game]);

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const saveGame = async () => {
    try {
      if (draft.conflict) return toast.error("Resolve the field conflict before saving.");
      const normalized = normalizeLeagueGame(draft, account, draft.sort_order || 0, draft.source_import_id || "manual");
      const response = await base44.functions.invoke("leagueGameAction", {
        action: "update_game",
        league_game_id: game.id,
        actor_account_id: account.id,
        actor_account_name: account.business_name,
        updates: { ...normalized, source_row_key: draft.source_row_key || normalized.source_row_key, league_event_id: draft.league_event_id || "", league_event_field_id: draft.league_event_field_id || "", field_name_snapshot: draft.field_name_snapshot || "" },
      });
      if (response?.data?.error) return toast.error(response.data.error);
      toast.success("Game updated.");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Could not update game.");
    }
  };

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#2C4F4E]">Edit Game</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {fieldGroups.map(([field, label]) => (
            <label key={field} className="space-y-1 text-xs font-bold text-slate-600">
              <span>{label}</span>
              <Input value={draft[field] || ""} onChange={(event) => setField(field, event.target.value)} />
            </label>
          ))}

          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Game Date</span>
            <Input type="date" value={draft.game_date || ""} onChange={(event) => setField("game_date", event.target.value)} />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Start Time</span>
            <Input value={draft.start_time?.includes("T") ? formatGameTime(draft.start_time) : draft.start_time || ""} onChange={(event) => setField("start_time", event.target.value)} />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>End Time</span>
            <Input value={draft.end_time?.includes("T") ? formatGameTime(draft.end_time) : draft.end_time || ""} onChange={(event) => setField("end_time", event.target.value)} />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">
            <span>League Event</span>
            <Select value={draft.league_event_id || "__none__"} onValueChange={(v) => setField("league_event_id", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Link to a League Event" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No event</SelectItem>
                {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">
            <span>Assigned Field</span>
            <LeagueFieldSelect accountId={account?.id} eventId={draft.league_event_id} value={draft.league_event_field_id} onChange={(patch) => setDraft((c) => ({ ...c, ...patch }))} game={draft} allGames={allGames || []} />
            {draft.conflict && <span className="text-[11px] font-bold text-red-600">⚠ {draft.conflict.home_team || ""} vs {draft.conflict.away_team || ""} at {draft.conflict.start_time ? new Date(draft.conflict.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</span>}
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Status</span>
            <Select value={draft.status || "upcoming"} onValueChange={(value) => setField("status", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
            </Select>
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Home Score</span>
            <Input type="number" value={draft.home_score ?? 0} onChange={(event) => setField("home_score", event.target.value)} />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Away Score</span>
            <Input type="number" value={draft.away_score ?? 0} onChange={(event) => setField("away_score", event.target.value)} />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-600">
            <span>Period Number</span>
            <Input type="number" value={draft.period_number ?? ""} onChange={(event) => setField("period_number", event.target.value)} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={saveGame} className="bg-[#5DADA5] text-white hover:bg-[#4A9B93]">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}