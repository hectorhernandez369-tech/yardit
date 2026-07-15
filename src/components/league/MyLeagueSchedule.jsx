import LeagueGamesTable from "./schedule/LeagueGamesTable";
import LeagueAuditHistory from "./LeagueAuditHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function MyLeagueSchedule({ title, description, account, games, assignments = [], memberships = [], user, onRefresh, readOnly = false }) {
  return <div className="space-y-4"><Card className="rounded-2xl bg-white"><CardContent className="p-5 space-y-2"><h2 className="flex items-center gap-2 text-2xl font-black text-[#2C4F4E]"><Trophy className="h-5 w-5" /> {title}</h2><p className="text-sm text-slate-600">{description}</p></CardContent></Card><LeagueGamesTable account={account} games={games} assignments={assignments} memberships={memberships} user={user} onRefresh={onRefresh} readOnly={readOnly} /><LeagueAuditHistory games={games} /></div>;
}