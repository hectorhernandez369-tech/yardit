import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import LeagueScheduleImporter from "./LeagueScheduleImporter";
import LeagueGamesTable from "./LeagueGamesTable";
import LeagueScheduleFormatGuide from "./LeagueScheduleFormatGuide";
import LeagueTeamScheduleImport from "./LeagueTeamScheduleImport";
import LeagueAuditHistory from "../LeagueAuditHistory";

export default function LeagueScheduleManager({ account, user, games = [], assignments = [], memberships = [], onRefresh, canManageSchedule = false }) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5 space-y-2">
          <h2 className="flex items-center gap-2 text-2xl font-black text-[#2C4F4E]"><Trophy className="h-5 w-5" /> Master Schedule</h2>
          <p className="text-sm text-slate-600">Upload or manage your league schedule here once. Yardit uses these same games for teams, scores, and league events so you do not have to enter the same game again.</p>
        </CardContent>
      </Card>
      {canManageSchedule && <LeagueScheduleFormatGuide />}
      {canManageSchedule && <LeagueScheduleImporter account={account} existingGames={games} onImported={onRefresh} />}
      {canManageSchedule && <LeagueTeamScheduleImport account={account} memberships={memberships} existingGames={games} onImported={onRefresh} />}
      <LeagueGamesTable account={account} user={user} games={games} assignments={assignments} memberships={memberships} onRefresh={onRefresh} readOnly={!canManageSchedule} canManageSchedule={canManageSchedule} />
      <LeagueAuditHistory games={games} />
    </div>
  );
}
