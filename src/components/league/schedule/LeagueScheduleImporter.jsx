import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import { formatGameDate, formatGameTime, normalizeLeagueGame, sortLeagueGames } from "./leagueGameUtils";

const normalizeTeamName = (value) => String(value || "").trim().toLowerCase();
const teamKey = (name) => normalizeTeamName(name);

export default function LeagueScheduleImporter({ account, existingGames = [], onImported }) {
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [teamChoices, setTeamChoices] = useState({});
  const existingKeys = useMemo(() => new Set(existingGames.map((game) => game.source_row_key).filter(Boolean)), [existingGames]);
  const { data: officialTeams = [], refetch: refetchTeams } = useQuery({ queryKey: ["leagueImportTeams", account?.id], queryFn: () => base44.entities.LeagueTeam.filter({ league_account_id: account.id, is_active: true }), enabled: !!account?.id });
  const { data: teamMappings = [], refetch: refetchMappings } = useQuery({ queryKey: ["leagueImportMappings", account?.id], queryFn: () => base44.entities.LeagueTeamNameMapping.filter({ league_account_id: account.id }), enabled: !!account?.id });
  const teamIdByName = useMemo(() => {
    const entries = officialTeams.map((team) => [normalizeTeamName(team.team_name), team.id]);
    teamMappings.forEach((mapping) => entries.push([normalizeTeamName(mapping.imported_name), mapping.team_id]));
    return new Map(entries.filter(([name, id]) => name && id));
  }, [officialTeams, teamMappings]);

  const discoveredTeams = useMemo(() => {
    const map = new Map();
    previewRows.forEach((game) => {
      [[game.home_team, game.home_team_id, game.home_town], [game.away_team, game.away_team_id, game.away_town]].forEach(([name, id, town]) => {
        const key = teamKey(name);
        if (!key) return;
        const current = map.get(key) || { key, name: String(name).trim(), town: town || "", division: game.division || game.age_group || "", gameCount: 0, teamId: id || teamIdByName.get(key) || "" };
        current.gameCount += 1;
        current.teamId = current.teamId || id || teamIdByName.get(key) || "";
        map.set(key, current);
      });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [previewRows, teamIdByName]);

  const unresolvedTeams = discoveredTeams.filter((team) => !team.teamId);

  const uploadSchedule = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
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
        return { ...game, home_team_id: game.home_team_id || teamIdByName.get(normalizeTeamName(game.home_team)) || "", away_team_id: game.away_team_id || teamIdByName.get(normalizeTeamName(game.away_team)) || "" };
      }).filter((row) => row.home_team || row.away_team || row.game_title));
      setPreviewRows(normalized);
      setSelectedKeys(normalized.filter((row) => !existingKeys.has(row.source_row_key)).map((row) => row.source_row_key));
      setTeamChoices({});
      toast.success(`${normalized.length} games found across the schedule.`);
    } catch (error) {
      console.error(error);
      toast.error("We couldn't read that schedule. Try another file or check the schedule format.");
    } finally {
      setLoading(false);
    }
  };

  const applyTeamIdToPreview = (importedName, id) => {
    const key = teamKey(importedName);
    setPreviewRows((rows) => rows.map((game) => ({
      ...game,
      home_team_id: teamKey(game.home_team) === key ? id : game.home_team_id,
      away_team_id: teamKey(game.away_team) === key ? id : game.away_team_id,
    })));
  };

  const matchExistingTeam = async (team) => {
    const selectedTeamId = teamChoices[team.key];
    if (!selectedTeamId) return toast.error("Choose the official team to connect.");
    const existingMapping = teamMappings.find((item) => normalizeTeamName(item.imported_name) === team.key && item.team_id === selectedTeamId);
    if (!existingMapping) {
      await base44.entities.LeagueTeamNameMapping.create({ league_account_id: account.id, team_id: selectedTeamId, imported_name: team.name, normalized_name: team.key, created_at: new Date().toISOString() });
      await refetchMappings();
    }
    applyTeamIdToPreview(team.name, selectedTeamId);
    setTeamChoices((current) => ({ ...current, [team.key]: "" }));
    toast.success(`${team.name} connected.`);
  };

  const createOfficialTeam = async (team) => {
    const created = await base44.entities.LeagueTeam.create({ league_account_id: account.id, team_name: team.name, town_name: team.town || "", division: team.division || "", season: "", sport: account?.business_category || "", is_active: true });
    await base44.entities.LeagueTeamNameMapping.create({ league_account_id: account.id, team_id: created.id, imported_name: team.name, normalized_name: team.key, created_at: new Date().toISOString() });
    await Promise.all([refetchTeams(), refetchMappings()]);
    applyTeamIdToPreview(team.name, created.id);
    toast.success(`${team.name} added as an official league team.`);
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return previewRows;
    return previewRows.filter((game) => [game.home_team, game.away_team, game.home_town, game.away_town, game.location, game.league_name, game.division, game.age_group].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [previewRows, search]);

  const importRows = async (rows) => {
    if (unresolvedTeams.length) return toast.error(`Resolve ${unresolvedTeams.length} team${unresolvedTeams.length === 1 ? "" : "s"} before importing.`);
    const deduped = sortLeagueGames(rows.filter((row) => !existingKeys.has(row.source_row_key)));
    if (!deduped.length) return toast.info("No new games to import.");
    await base44.entities.LeagueGame.bulkCreate(deduped.map((game, index) => ({ ...game, sort_order: index })));
    toast.success(`${deduped.length} games imported.`);
    setPreviewRows([]);
    setSelectedKeys([]);
    setTeamChoices({});
    onImported?.();
  };

  const selectedFilteredRows = filteredRows.filter((game) => selectedKeys.includes(game.source_row_key));
  const duplicateCount = previewRows.filter((row) => existingKeys.has(row.source_row_key)).length;
  const linkedTeamCount = discoveredTeams.length - unresolvedTeams.length;

  return (
    <Card className="rounded-2xl bg-white">
      <CardContent className="p-4 sm:p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-black text-[#2C4F4E]">Upload League Schedule</h3><p className="text-sm text-slate-600">Upload Excel, XLS, or CSV. Yardit will identify the teams first, then let you review the games.</p></div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#F4A849] px-4 py-2 text-sm font-bold text-[#2C4F4E] hover:bg-[#E39635]"><Upload className="h-4 w-4" /> {loading ? "Reading..." : "Choose File"}<Input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={(e) => uploadSchedule(e.target.files?.[0])} /></label>
        </div>

        {previewRows.length > 0 && <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <div className="rounded-xl border bg-slate-50 p-3"><p className="text-2xl font-black text-[#2C4F4E]">{previewRows.length}</p><p className="text-xs text-slate-500">Games found</p></div>
            <div className="rounded-xl border bg-slate-50 p-3"><p className="text-2xl font-black text-[#2C4F4E]">{discoveredTeams.length}</p><p className="text-xs text-slate-500">Teams found</p></div>
            <div className="rounded-xl border bg-green-50 p-3"><p className="text-2xl font-black text-green-700">{linkedTeamCount}</p><p className="text-xs text-green-700">Teams linked</p></div>
            <div className={`rounded-xl border p-3 ${unresolvedTeams.length ? "bg-amber-50" : "bg-green-50"}`}><p className={`text-2xl font-black ${unresolvedTeams.length ? "text-amber-700" : "text-green-700"}`}>{unresolvedTeams.length}</p><p className="text-xs text-slate-600">Need attention</p></div>
            <div className="rounded-xl border bg-slate-50 p-3"><p className="text-2xl font-black text-[#2C4F4E]">{duplicateCount}</p><p className="text-xs text-slate-500">Duplicates</p></div>
          </div>

          <section className="rounded-2xl border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3"><div><h4 className="font-black text-[#2C4F4E] flex items-center gap-2"><Users className="h-4 w-4" /> Review Teams</h4><p className="text-xs text-slate-500">Make sure every schedule name points to one official team. You only do this once per name.</p></div>{unresolvedTeams.length === 0 && <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" /> All teams ready</Badge>}</div>
            <div className="grid gap-2 lg:grid-cols-2">
              {discoveredTeams.map((team) => <div key={team.key} className={`rounded-xl border p-3 ${team.teamId ? "bg-green-50/50" : "bg-amber-50/60 border-amber-200"}`}>
                <div className="flex items-start justify-between gap-2"><div><p className="font-bold text-[#2C4F4E]">{team.name}</p><p className="text-xs text-slate-500">{team.town || "Town not listed"} · {team.division || "Division not listed"} · {team.gameCount} game{team.gameCount === 1 ? "" : "s"}</p></div>{team.teamId ? <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" /> Linked</Badge> : <Badge className="bg-amber-100 text-amber-800"><AlertTriangle className="mr-1 h-3 w-3" /> Needs match</Badge>}</div>
                {!team.teamId && <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><Select value={teamChoices[team.key] || ""} onValueChange={(value) => setTeamChoices((current) => ({ ...current, [team.key]: value }))}><SelectTrigger><SelectValue placeholder="Match to existing team" /></SelectTrigger><SelectContent>{officialTeams.map((item) => <SelectItem key={item.id} value={item.id}>{item.team_name}{item.division ? ` · ${item.division}` : ""}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => matchExistingTeam(team)} disabled={!teamChoices[team.key]}>Connect</Button><Button onClick={() => createOfficialTeam(team)} className="bg-[#006168] text-white hover:bg-[#004f55]">+ New Team</Button></div>}
              </div>)}
            </div>
          </section>

          <section className="space-y-3">
            <div><h4 className="font-black text-[#2C4F4E]">Review Games</h4><p className="text-xs text-slate-500">Once the teams are connected, review the schedule and choose what to import.</p></div>
            <Input placeholder="Search team, town, division, or organization" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-96 overflow-auto rounded-xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["", "Week", "Division", "Matchup", "Date", "Start", "Field", "Status"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{filteredRows.map((game) => { const duplicate = existingKeys.has(game.source_row_key); return <tr key={game.source_row_key} className={`border-t ${duplicate ? "bg-slate-50 text-slate-400" : "bg-white"}`}><td className="p-2"><Checkbox disabled={duplicate} checked={selectedKeys.includes(game.source_row_key)} onCheckedChange={(checked) => setSelectedKeys((current) => checked ? [...new Set([...current, game.source_row_key])] : current.filter((key) => key !== game.source_row_key))} /></td><td className="p-2">{game.notes || game.week || ""}</td><td className="p-2">{game.division || game.age_group}</td><td className="p-2"><div className="font-semibold flex items-center gap-1">{game.home_team || "TBD"}{game.home_team_id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}</div><div className="text-xs text-slate-500 flex items-center gap-1">vs {game.away_team || "TBD"}{game.away_team_id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}</div></td><td className="p-2">{formatGameDate(game.game_date)}</td><td className="p-2">{formatGameTime(game.start_time)}</td><td className="p-2">{game.field_name || game.location || "—"}</td><td className="p-2">{duplicate ? "Duplicate" : "Ready"}</td></tr>; })}</tbody></table></div>
            <div className="flex flex-wrap gap-2"><Button disabled={unresolvedTeams.length > 0} onClick={() => importRows(selectedFilteredRows.length ? selectedFilteredRows : filteredRows)} className="bg-[#006168] text-white hover:bg-[#004f55]">Import {selectedFilteredRows.length || filteredRows.filter((row) => !existingKeys.has(row.source_row_key)).length} Selected Games</Button><Button disabled={unresolvedTeams.length > 0} variant="outline" onClick={() => importRows(previewRows)}>Import All New Games</Button><Button variant="ghost" onClick={() => { setPreviewRows([]); setSelectedKeys([]); setTeamChoices({}); }}><X className="h-4 w-4" /> Clear Preview</Button></div>
            {unresolvedTeams.length > 0 && <p className="text-xs font-semibold text-amber-700">Resolve the {unresolvedTeams.length} team{unresolvedTeams.length === 1 ? "" : "s"} marked “Needs match” before importing.</p>}
          </section>
        </div>}
      </CardContent>
    </Card>
  );
}
