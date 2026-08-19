import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LEAGUE_GAME_STATUSES, formatGameDate, formatGameTime } from "@/components/league/schedule/leagueGameUtils";
import { effectiveGameStatus } from "@/components/league/scoreboard/leagueScoreboardUtils";

const badgeStyle = (status) => status === "final" ? "bg-green-100 text-green-800" : ["live", "halftime", "delayed"].includes(status) ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";

export default function OrganizerScoreGameCard({ account, game, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const shownStatus = effectiveGameStatus(game);
  const [draft, setDraft] = useState({ home_score: game.home_score ?? "", away_score: game.away_score ?? "", status: shownStatus });
  useEffect(() => setDraft({ home_score: game.home_score ?? "", away_score: game.away_score ?? "", status: shownStatus }), [game.home_score, game.away_score, shownStatus]);
  const save = async () => {
    if (draft.home_score === "" || draft.away_score === "" || !Number.isFinite(Number(draft.home_score)) || !Number.isFinite(Number(draft.away_score))) return toast.error("Enter valid home and away scores.");
    setSaving(true);
    const response = await base44.functions.invoke("leagueGameAction", { action: "update_game", league_game_id: game.id, actor_account_id: account.id, actor_account_name: account.business_name, updates: { home_score: Number(draft.home_score), away_score: Number(draft.away_score), status: draft.status } });
    setSaving(false);
    if (response?.data?.error) return toast.error(response.data.error);
    toast.success("Score updated."); setEditing(false); onRefresh?.();
  };
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-start justify-between gap-2"><div><p className="font-black text-[#2C4F4E]">{game.home_team || "Home Team"} <span className="font-medium text-slate-400">vs</span> {game.away_team || "Away Team"}</p><p className="mt-1 text-xs text-slate-600">{formatGameDate(game.game_date)} · {formatGameTime(game.start_time)} · {game.field_name_snapshot || game.field_name || game.location || "Location TBD"}</p></div><Badge className={`shrink-0 capitalize ${badgeStyle(shownStatus)}`}>{shownStatus}</Badge></div>
    {!editing ? <div className="mt-3 flex items-center justify-between"><p className="text-lg font-black text-slate-900">{game.home_score ?? "—"} - {game.away_score ?? "—"}</p><Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button></div> : <div className="mt-3 space-y-3"><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-600">Home score<Input type="number" min="0" value={draft.home_score} onChange={(e) => setDraft({ ...draft, home_score: e.target.value })} /></label><label className="text-xs font-bold text-slate-600">Away score<Input type="number" min="0" value={draft.away_score} onChange={(e) => setDraft({ ...draft, away_score: e.target.value })} /></label></div><Select value={draft.status} onValueChange={(status) => setDraft({ ...draft, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAGUE_GAME_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button><Button className="flex-1 bg-[#006168] text-white hover:bg-[#004f55]" disabled={saving} onClick={save}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></div></div>}
  </div>;
}