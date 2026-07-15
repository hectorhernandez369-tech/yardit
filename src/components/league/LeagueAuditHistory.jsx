import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export default function LeagueAuditHistory({ games = [] }) {
  const gameIds = games.map((game) => game.id).filter(Boolean);
  const { data: logs = [] } = useQuery({ queryKey: ["leagueAuditLogs", gameIds.join("|")], queryFn: async () => {
    const batches = await Promise.all(gameIds.slice(0, 100).map((id) => base44.entities.LeagueGameAuditLog.filter({ league_game_id: id }, "-created_at").catch(() => [])));
    return batches.flat().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 100);
  }, enabled: gameIds.length > 0 });

  return <Card className="rounded-2xl bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-[#2C4F4E]"><History className="h-5 w-5" /> Score & Schedule Audit History</CardTitle></CardHeader><CardContent className="space-y-2">{logs.length === 0 ? <p className="text-sm text-slate-500">No score, schedule, lock, unlock, or permission changes have been logged yet.</p> : logs.map((log) => <div key={log.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><p className="font-bold text-[#2C4F4E]">{log.action_type}</p><Badge>{log.was_unlocked ? "unlocked" : log.was_locked ? "locked" : "changed"}</Badge></div><p className="text-xs text-slate-600">{log.edited_by_email || "Unknown user"} · {log.created_at ? new Date(log.created_at).toLocaleString() : "Unknown time"}</p><p className="text-xs text-slate-600">Score: {log.previous_home_score ?? 0}-{log.previous_away_score ?? 0} → {log.new_home_score ?? 0}-{log.new_away_score ?? 0}</p>{log.reason && <p className="mt-1 text-sm text-slate-700">Reason: {log.reason}</p>}</div>)}</CardContent></Card>;
}