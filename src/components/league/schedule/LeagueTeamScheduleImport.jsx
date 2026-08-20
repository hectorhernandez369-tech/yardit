import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { buildSourceRowKey, formatGameDate, formatGameTime, sortLeagueGames } from "./leagueGameUtils";

const gameSignature = (game) => [
  game?.game_date,
  game?.start_time,
  game?.division || game?.age_group,
  game?.home_team,
  game?.away_team,
].map((value) => String(value || "").trim().toLowerCase()).join("|");

export default function LeagueTeamScheduleImport({ account, memberships = [], existingGames = [], onImported }) {
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [saving, setSaving] = useState(false);

  const teamAccountIds = useMemo(() => [...new Set(
    memberships
      .filter((item) => item.league_account_id === account?.id && item.status === "active" && item.membership_type === "team_organization" && item.member_account_id)
      .map((item) => item.member_account_id)
  )], [memberships, account?.id]);

  const { data: teamAccounts = [] } = useQuery({
    queryKey: ["leagueConnectedTeamAccountsForSchedule", account?.id, teamAccountIds.join("|")],
    queryFn: async () => {
      const batches = await Promise.all(teamAccountIds.map((id) => base44.entities.VendorAccount.filter({ id }).catch(() => [])));
      return batches.flat();
    },
    enabled: teamAccountIds.length > 0,
  });

  const { data: teamScheduleRows = [] } = useQuery({
    queryKey: ["leagueConnectedTeamScheduleRows", account?.id, teamAccountIds.join("|")],
    queryFn: async () => {
      const rows = [];
      for (const teamAccountId of teamAccountIds) {
        const [ownGames, links] = await Promise.all([
          base44.entities.LeagueGame.filter({ vendor_account_id: teamAccountId }, "sort_order").catch(() => []),
          base44.entities.TeamScheduleGameLink.filter({ team_account_id: teamAccountId, is_active: true }).catch(() => []),
        ]);

        ownGames.forEach((game) => rows.push({ game, team_account_id: teamAccountId, source: "team" }));

        const linkedIds = [...new Set(links.map((link) => link.league_game_id).filter(Boolean))];
        const linkedBatches = await Promise.all(linkedIds.map((id) => base44.entities.LeagueGame.filter({ id }).catch(() => [])));
        linkedBatches.flat().forEach((game) => rows.push({ game, team_account_id: teamAccountId, source: "linked" }));
      }
      return rows;
    },
    enabled: teamAccountIds.length > 0,
  });

  const existingSignatures = useMemo(() => new Set(existingGames.map(gameSignature)), [existingGames]);
  const existingIds = useMemo(() => new Set(existingGames.map((game) => game.id)), [existingGames]);

  const candidates = useMemo(() => {
    const seen = new Set();
    return sortLeagueGames(teamScheduleRows
      .filter(({ game }) => game?.id && game.vendor_account_id !== account?.id && !existingIds.has(game.id))
      .filter(({ game }) => {
        const key = `${game.id}|${gameSignature(game)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ game, team_account_id, source }) => ({ ...game, _source_team_account_id: team_account_id, _team_schedule_source: source })));
  }, [teamScheduleRows, account?.id, existingIds]);

  const available = candidates.filter((game) => !existingSignatures.has(gameSignature(game)));

  const importSelected = async () => {
    const selected = available.filter((game) => selectedKeys.includes(`${game._source_team_account_id}:${game.id}`));
    if (!selected.length) return toast.info("Select at least one team-schedule game first.");
    setSaving(true);
    try {
      const payload = selected.map((game, index) => {
        const clone = {
          ...game,
          id: undefined,
          created_date: undefined,
          updated_date: undefined,
          created_by: undefined,
          created_by_id: undefined,
          is_sample: undefined,
          _source_team_account_id: undefined,
          _team_schedule_source: undefined,
          vendor_account_id: account.id,
          league_name: account.business_name || game.league_name || "",
          source_import_id: `team-schedule:${game._source_team_account_id}:${game.id}`,
          sort_order: existingGames.length + index,
        };
        clone.source_row_key = buildSourceRowKey(clone);
        return clone;
      });
      await base44.entities.LeagueGame.bulkCreate(payload);
      toast.success(`${payload.length} game${payload.length === 1 ? "" : "s"} added from team schedule.`);
      setSelectedKeys([]);
      onImported?.();
    } catch (error) {
      console.error("Team schedule import failed:", error);
      toast.error("Could not add the selected team schedule games.");
    } finally {
      setSaving(false);
    }
  };

  const teamName = (id) => teamAccounts.find((item) => item.id === id)?.business_name || "Connected Team";

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-black text-[#2C4F4E]"><Users className="h-4 w-4" /> Add Games From Team Schedules</h3>
            <p className="text-xs text-slate-500">Pull a game a connected team already has into this league's Master Schedule. Yardit creates one league copy so the Master Schedule remains the source of truth.</p>
          </div>
          <Button onClick={importSelected} disabled={saving || selectedKeys.length === 0} className="shrink-0 gap-2 bg-[#006168] text-white hover:bg-[#004f55]"><Plus className="h-4 w-4" /> Add Selected ({selectedKeys.length})</Button>
        </div>

        {teamAccountIds.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-slate-500">No connected team accounts yet.</p>
        ) : available.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-slate-500">No additional team-schedule games are available to add. Games already in this Master Schedule are intentionally excluded.</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="bg-slate-100 text-[#2C4F4E]"><tr>{["", "Team Account", "Matchup", "Date", "Time", "Division", "Game ID"].map((heading) => <th key={heading} className="p-2 text-left font-black">{heading}</th>)}</tr></thead>
              <tbody>{available.map((game) => {
                const key = `${game._source_team_account_id}:${game.id}`;
                return <tr key={key} className="border-t bg-white"><td className="p-2"><Checkbox checked={selectedKeys.includes(key)} onCheckedChange={(checked) => setSelectedKeys((current) => checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))} /></td><td className="p-2"><div className="font-semibold">{teamName(game._source_team_account_id)}</div><div className="font-mono text-[10px] text-slate-400 break-all">ID: {game._source_team_account_id}</div></td><td className="p-2 font-semibold">{game.home_team || "TBD"} vs {game.away_team || "TBD"}</td><td className="p-2">{formatGameDate(game.game_date)}</td><td className="p-2">{formatGameTime(game.start_time)}</td><td className="p-2">{game.division || game.age_group || "—"}</td><td className="p-2 font-mono text-[10px] text-slate-500 break-all">{game.id}</td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
