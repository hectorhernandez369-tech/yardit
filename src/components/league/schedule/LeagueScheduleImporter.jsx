import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { formatGameDate, formatGameTime, normalizeLeagueGame, sortLeagueGames } from "./leagueGameUtils";

const normalizeTeamName = (value) => String(value || "").trim().toLowerCase();

export default function LeagueScheduleImporter({ account, existingGames = [], onImported }) {
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const existingKeys = useMemo(() => new Set(existingGames.map((game) => game.source_row_key).filter(Boolean)), [existingGames]);
  const { data: officialTeams = [] } = useQuery({ queryKey: ["leagueImportTeams", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }), enabled: !!account?.id });
  const { data: teamMappings = [] } = useQuery({ queryKey: ["leagueImportMappings", account?.id], queryFn: () => base44.entities.LeagueTeamNameMapping.filter({ league_account_id: account.id }), enabled: !!account?.id });
  const teamIdByName = useMemo(() => {
    const entries = officialTeams.map((team) => [normalizeTeamName(team.team_name), team.id]);
    teamMappings.forEach((mapping) => entries.push([normalizeTeamName(mapping.imported_name), mapping.team_id]));
    return new Map(entries.filter(([name, id]) => name && id));
  }, [officialTeams, teamMappings]);

  const uploadSchedule = async (file) => {
    if (!file) return;
    setLoading(true);
    const sourceImportId = `${account.id}-${Date.now()}`;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    let rows = [];

    const parsed = await base44.functions.invoke("parseLeagueScheduleUpload", { file_url });
    rows = parsed?.data?.games || [];

    if (!rows.length) {
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: { type: "object", properties: { games: { type: "array", items: { type: "object", additionalProperties: true } }, rows: { type: "array", items: { type: "object", additionalProperties: true } } } },
      });
      rows = Array.isArray(extracted.output) ? extracted.output : extracted.output?.games || extracted.output?.rows || [];
    }

    const normalized = sortLeagueGames(rows.map((row, index) => {
      const game = normalizeLeagueGame(row, account, index, sourceImportId);
      return {
        ...game,
        home_team_id: game.home_team_id || teamIdByName.get(normalizeTeamName(game.home_team)) || "",
        away_team_id: game.away_team_id || teamIdByName.get(normalizeTeamName(game.away_team)) || "",
      };
    }).filter((row) => row.home_team || row.away_team || row.game_title));
    setPreviewRows(normalized);
    setSelectedKeys(normalized.filter((row) => !existingKeys.has(row.source_row_key)).map((row) => row.source_row_key));
    toast.success(`${normalized.length} games found across the schedule.`);
    setLoading(false);
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return previewRows;
    return previewRows.filter((game) => [game.home_team, game.away_team, game.home_town, game.away_town, game.location, game.league_name, game.division, game.age_group].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [previewRows, search]);

  const importRows = async (rows) => {
    const deduped = sortLeagueGames(rows.filter((row) => !existingKeys.has(row.source_row_key)));
    if (!deduped.length) {
      toast.info("No new games to import.");
      return;
    }
    await base44.entities.LeagueGame.bulkCreate(deduped.map((game, index) => ({ ...game, sort_order: index })));
    toast.success(`${deduped.length} games imported.`);
    setPreviewRows([]);
    setSelectedKeys([]);
    onImported?.();
  };

  const selectedFilteredRows = filteredRows.filter((game) => selectedKeys.includes(game.source_row_key));

  return (
    <Card className="rounded-2xl bg-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-black text-[#2C4F4E]">Upload League Schedule</h3><p className="text-sm text-slate-600">Upload Excel, XLS, or CSV, preview every game, then import all or only the filtered games.</p></div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#F4A849] px-4 py-2 text-sm font-bold text-[#2C4F4E] hover:bg-[#E39635]"><Upload className="h-4 w-4" /> {loading ? "Reading..." : "Choose File"}<Input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={(e) => uploadSchedule(e.target.files?.[0])} /></label>
        </div>
        {previewRows.length > 0 && <div className="space-y-3"><Input placeholder="Search town, team, division, or organization — e.g. Lindsay" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="max-h-96 overflow-auto rounded-xl border"><table className="w-full min-w-[980px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["", "Week", "Division", "Home", "Away", "Team IDs", "Towns", "Date", "Start", "Field", "Status"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{filteredRows.map((game) => { const duplicate = existingKeys.has(game.source_row_key); return <tr key={game.source_row_key} className={`border-t ${duplicate ? "bg-slate-50 text-slate-400" : "bg-white"}`}><td className="p-2"><Checkbox disabled={duplicate} checked={selectedKeys.includes(game.source_row_key)} onCheckedChange={(checked) => setSelectedKeys((current) => checked ? [...new Set([...current, game.source_row_key])] : current.filter((key) => key !== game.source_row_key))} /></td><td className="p-2">{game.notes || game.week || ""}</td><td className="p-2">{game.division || game.age_group}</td><td className="p-2 font-semibold">{game.home_team}</td><td className="p-2 font-semibold">{game.away_team}</td><td className="p-2 text-xs"><div>{game.home_team_id ? "Home linked" : "Home unmatched"}</div><div>{game.away_team_id ? "Away linked" : "Away unmatched"}</div></td><td className="p-2">{[game.home_town, game.away_town].filter(Boolean).join(" / ")}</td><td className="p-2">{formatGameDate(game.game_date)}</td><td className="p-2">{formatGameTime(game.start_time)}</td><td className="p-2">{game.field_name || game.location}</td><td className="p-2">{duplicate ? "Duplicate" : "Ready"}</td></tr>; })}</tbody></table></div><div className="flex flex-wrap gap-2"><Button onClick={() => importRows(selectedFilteredRows.length ? selectedFilteredRows : filteredRows)}>Import Only These Games</Button><Button variant="outline" onClick={() => importRows(previewRows)}>Import All Games</Button><Button variant="ghost" onClick={() => { setPreviewRows([]); setSelectedKeys([]); }}><X className="h-4 w-4" /> Clear Preview</Button></div></div>}
      </CardContent>
    </Card>
  );
}