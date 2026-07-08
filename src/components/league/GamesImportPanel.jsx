import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import GamesFormatGuide from "./GamesFormatGuide";
import { formatScheduleDate, parseScheduleDate, parseScheduleTime } from "@/lib/vendorEventSchedule";

const getValue = (row, keys) => {
  const found = Object.keys(row || {}).find((key) => keys.includes(key.trim().toLowerCase()));
  return found ? row[found] : "";
};

const toDateOnly = (value) => parseScheduleDate(value);

const emptyManualGame = { field_name: "", game_title: "", home_team: "", away_team: "", game_date: "", start_time: "", end_time: "", notes: "" };

export default function GamesImportPanel({ account, onImported }) {
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [manualGame, setManualGame] = useState(emptyManualGame);

  const handleUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: { type: "object", properties: { rows: { type: "array", items: { type: "object", properties: { Field: { type: "string" }, Game: { type: "string" }, "Home Team": { type: "string" }, "Away Team": { type: "string" }, Date: { type: "string" }, "Start Time": { type: "string" }, "End Time": { type: "string" }, Notes: { type: "string" } } } } } }
    });
    const rows = Array.isArray(extracted.output) ? extracted.output : extracted.output?.rows || [];
    setPreviewRows(rows.map((item, index) => {
      const homeTeam = String(getValue(item, ["home team", "home", "team 1"]) || "").trim();
      const awayTeam = String(getValue(item, ["away team", "away", "team 2", "opponent"]) || "").trim();
      const gameTitle = String(getValue(item, ["game", "activity", "matchup", "title"]) || [homeTeam, awayTeam].filter(Boolean).join(" vs ")).trim();
      const gameDate = toDateOnly(getValue(item, ["date", "game date"]));
      return {
        vendor_account_id: account.id,
        field_name: String(getValue(item, ["field", "court", "location"]) || "").trim(),
        game_title: gameTitle,
        home_team: homeTeam,
        away_team: awayTeam,
        game_date: gameDate,
        start_time: parseScheduleTime(gameDate || new Date().toISOString(), String(getValue(item, ["start time", "start", "time"]) || ""), gameDate),
        end_time: parseScheduleTime(gameDate || new Date().toISOString(), String(getValue(item, ["end time", "end"]) || ""), gameDate),
        notes: String(getValue(item, ["notes", "note"]) || "").trim(),
        sort_order: index,
      };
    }).filter((row) => row.game_title));
    setLoading(false);
  };

  const confirmImport = async () => {
    if (!previewRows.length) return;
    await base44.entities.LeagueGame.bulkCreate(previewRows);
    toast.success(`${previewRows.length} games imported.`);
    setPreviewRows([]);
    onImported?.();
  };

  const updateManualGame = (field, value) => setManualGame((current) => ({ ...current, [field]: value }));

  const addManualGame = async () => {
    const homeTeam = manualGame.home_team.trim();
    const awayTeam = manualGame.away_team.trim();
    const gameTitle = manualGame.game_title.trim() || [homeTeam, awayTeam].filter(Boolean).join(" vs ");
    if (!gameTitle) {
      toast.error("Add a game title or teams first.");
      return;
    }
    const gameDate = toDateOnly(manualGame.game_date);
    await base44.entities.LeagueGame.create({
      vendor_account_id: account.id,
      field_name: manualGame.field_name.trim(),
      game_title: gameTitle,
      home_team: homeTeam,
      away_team: awayTeam,
      game_date: gameDate,
      start_time: parseScheduleTime(gameDate || new Date().toISOString(), manualGame.start_time, gameDate),
      end_time: parseScheduleTime(gameDate || new Date().toISOString(), manualGame.end_time, gameDate),
      notes: manualGame.notes.trim(),
      sort_order: Date.now(),
    });
    toast.success("Game added.");
    setManualGame(emptyManualGame);
    onImported?.();
  };

  return (
    <div className="space-y-4">
      <GamesFormatGuide />
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-black text-[#2C4F4E]">Upload Games File</h3><p className="text-sm text-slate-600">Upload .xlsx, .xls, or .csv, preview it, then confirm import.</p></div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#F4A849] px-4 py-2 text-sm font-bold text-[#2C4F4E] hover:bg-[#E39635]"><Upload className="h-4 w-4" /> {loading ? "Reading..." : "Choose File"}<Input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={(e) => handleUpload(e.target.files?.[0])} /></label>
        </div>
        {previewRows.length > 0 && <div className="space-y-3"><div className="max-h-80 overflow-auto rounded-xl border"><table className="w-full min-w-[820px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["Field", "Game", "Home", "Away", "Date", "Start", "Notes"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{previewRows.map((row, index) => <tr key={`${row.game_title}-${index}`} className="border-t"><td className="p-2">{row.field_name}</td><td className="p-2 font-semibold">{row.game_title}</td><td className="p-2">{row.home_team}</td><td className="p-2">{row.away_team}</td><td className="p-2">{formatScheduleDate(row.game_date)}</td><td className="p-2">{row.start_time ? new Date(row.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</td><td className="p-2">{row.notes}</td></tr>)}</tbody></table></div><div className="flex gap-2"><Button onClick={confirmImport}>Confirm Import</Button><Button variant="outline" onClick={() => setPreviewRows([])}><X className="h-4 w-4" /> Cancel</Button></div></div>}
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div>
          <h3 className="font-black text-[#2C4F4E]">Manually Add Game</h3>
          <p className="text-sm text-slate-600">Enter one game at a time using the same columns shown in the spreadsheet example.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Field" value={manualGame.field_name} onChange={(e) => updateManualGame("field_name", e.target.value)} />
          <Input placeholder="Game" value={manualGame.game_title} onChange={(e) => updateManualGame("game_title", e.target.value)} />
          <Input placeholder="Home Team" value={manualGame.home_team} onChange={(e) => updateManualGame("home_team", e.target.value)} />
          <Input placeholder="Away Team" value={manualGame.away_team} onChange={(e) => updateManualGame("away_team", e.target.value)} />
          <Input placeholder="Date, e.g. 7/18/2026" value={manualGame.game_date} onChange={(e) => updateManualGame("game_date", e.target.value)} />
          <Input placeholder="Start Time, e.g. 9:00 AM" value={manualGame.start_time} onChange={(e) => updateManualGame("start_time", e.target.value)} />
          <Input placeholder="End Time, e.g. 10:15 AM" value={manualGame.end_time} onChange={(e) => updateManualGame("end_time", e.target.value)} />
          <Input placeholder="Notes" value={manualGame.notes} onChange={(e) => updateManualGame("notes", e.target.value)} />
        </div>
        <Button onClick={addManualGame} className="gap-2 bg-[#5DADA5] text-white hover:bg-[#4A9B93]"><Plus className="h-4 w-4" /> Add Game</Button>
      </div>
    </div>
  );
}