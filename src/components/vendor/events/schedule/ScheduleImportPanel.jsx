import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import ScheduleFormatGuide from "./ScheduleFormatGuide";
import { makeScheduleRowId, parseScheduleDate, parseScheduleTime, normalizeAndSortScheduleRows, validateScheduleRows } from "@/lib/vendorEventSchedule";

const getValue = (row, keys) => {
  const found = Object.keys(row || {}).find((key) => keys.includes(key.trim().toLowerCase()));
  return found ? row[found] : "";
};

const timePreview = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function ScheduleImportPanel({ fields, eventDate, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [assignments, setAssignments] = useState({});

  const unmatched = useMemo(() => [...new Set(previewRows.filter((row) => row.warning?.includes("Field not found")).map((row) => row.field_name))], [previewRows]);
  const hasWarnings = previewRows.some((row) => String(row.warning || "").trim());

  const handleUpload = async (file) => {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(extension)) {
      toast.error("Please upload an Excel .xlsx file or a .csv file.");
      return;
    }

    setLoading(true);
    setPreviewRows([]);
    setAssignments({});

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error("The file could not be uploaded.");

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  Field: { type: ["string", "number"] },
                  Activity: { type: ["string", "number"] },
                  "Start Time": { type: ["string", "number"] },
                  "End Time": { type: ["string", "number"] },
                  Date: { type: ["string", "number"] },
                  Notes: { type: ["string", "number"] },
                },
              },
            },
          },
        },
      });

      const rows = Array.isArray(extracted?.output) ? extracted.output : extracted?.output?.rows || [];
      if (!rows.length) throw new Error("No schedule rows were found. Confirm the spreadsheet contains Field, Activity, Start Time, and Date columns.");

      const mappedRows = rows.map((item, index) => {
        const originalFieldName = String(getValue(item, ["field", "field name", "flag", "area", "location"]) || "Main Event").trim();
        const matchedField = fields.find((field) => String(field.title || "").trim().toLowerCase() === originalFieldName.toLowerCase());
        const rawDate = getValue(item, ["date"]);
        const parsedDate = parseScheduleDate(rawDate) || parseScheduleDate(eventDate);
        const startTime = parseScheduleTime(eventDate, getValue(item, ["start time", "start", "time", "game time"]), parsedDate);
        const endTime = parseScheduleTime(eventDate, getValue(item, ["end time", "end"]), parsedDate);
        const title = String(getValue(item, ["activity", "activity/game name", "game", "game name", "title", "matchup"]) || "").trim();
        const warnings = [];

        if (!matchedField && fields.length > 1) warnings.push("Field not found");
        if (!title) warnings.push("Missing activity name");
        if (!startTime) warnings.push("Invalid start time or date");

        return {
          id: makeScheduleRowId(),
          spot_id: matchedField?.id || "",
          field_name: matchedField?.title || originalFieldName,
          title,
          start_time: startTime,
          end_time: endTime,
          notes: String(getValue(item, ["notes", "note"]) || "").trim(),
          date: parsedDate,
          sort_order: index,
          warning: warnings.join(", "),
        };
      });

      setPreviewRows(normalizeAndSortScheduleRows(mappedRows));
    } catch (error) {
      console.error("Schedule import failed:", error);
      toast.error(error?.message || "The schedule could not be imported.");
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = () => {
    const resolvedRows = previewRows.map((row) => {
      const assignedId = assignments[row.field_name];
      const assignedField = fields.find((field) => field.id === assignedId || field.title === assignedId);
      const existingField = fields.find((field) => field.id === row.spot_id || String(field.title || "").trim().toLowerCase() === String(row.field_name || "").trim().toLowerCase());
      const field = assignedField || existingField;
      return { ...row, spot_id: field?.id || "", field_name: field?.title || row.field_name || "Main Event", warning: "" };
    });

    const validatedRows = validateScheduleRows(resolvedRows, fields);
    const invalidRows = validatedRows.filter((row) => row.validation_errors.length > 0);

    if (invalidRows.length > 0) {
      const missingFields = invalidRows.filter((row) => row.validation_errors.some((error) => error.includes("field"))).length;
      const missingTitles = invalidRows.filter((row) => row.validation_errors.some((error) => error.includes("Activity"))).length;
      const missingTimes = invalidRows.filter((row) => row.validation_errors.some((error) => error.includes("start"))).length;

      toast.error(`${invalidRows.length} schedule row${invalidRows.length === 1 ? "" : "s"} need correction. ${missingFields} field issue(s), ${missingTitles} missing activity name(s), ${missingTimes} invalid start time(s).`);
      setPreviewRows(validatedRows.map((row) => ({ ...row, warning: row.validation_errors.join(" ") })));
      return;
    }

    const sortedRows = normalizeAndSortScheduleRows(validatedRows);
    onConfirm(sortedRows.map(({ validation_errors, row_number, warning, ...row }) => row));
    setPreviewRows([]);
    setAssignments({});
    toast.success(`${sortedRows.length} schedule rows imported and sorted.`);
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <ScheduleFormatGuide />
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><h3 className="font-black text-[#2C4F4E]">Upload Schedule File</h3><p className="text-sm text-slate-600">Upload .xlsx or .csv, preview it, then confirm import.</p></div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#F4A849] px-4 py-2 text-sm font-bold text-[#2C4F4E] hover:bg-[#E39635]"><Upload className="h-4 w-4" /> {loading ? "Reading..." : "Choose File"}<Input type="file" accept=".xlsx,.csv" className="hidden" disabled={loading} onChange={(e) => handleUpload(e.target.files?.[0])} /></label>
        </div>

        {previewRows.length > 0 && <div className="space-y-3">
          {unmatched.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2"><p className="font-bold text-amber-800">Field not found. Assign unmatched fields before saving.</p>{unmatched.map((name) => <div key={name} className="grid gap-2 sm:grid-cols-[1fr_220px]"><span className="text-sm font-semibold text-amber-900">{name}</span><Select value={assignments[name] || ""} onValueChange={(value) => { setAssignments({ ...assignments, [name]: value }); setPreviewRows((prev) => prev.map((row) => row.field_name === name ? { ...row, warning: String(row.warning || "").split(", ").filter((item) => item !== "Field not found").join(", ") } : row)); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Assign to field" /></SelectTrigger><SelectContent>{fields.map((field) => <SelectItem key={field.id || field.title} value={field.id || field.title}>{field.title}</SelectItem>)}</SelectContent></Select></div>)}</div>}
          <div className="max-h-80 overflow-auto rounded-xl border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["Field", "Activity", "Start Time", "End Time", "Notes", "Status"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{previewRows.map((row) => <tr key={row.id} className="border-t"><td className="p-2">{row.field_name}</td><td className="p-2">{row.title}</td><td className="p-2">{timePreview(row.start_time)}</td><td className="p-2">{timePreview(row.end_time)}</td><td className="p-2">{row.notes}</td><td className="p-2 text-amber-700">{row.warning}</td></tr>)}</tbody></table></div>
          <div className="flex gap-2"><Button onClick={confirmImport} disabled={hasWarnings}>Confirm Import</Button><Button variant="outline" onClick={() => { setPreviewRows([]); setAssignments({}); }}><X className="h-4 w-4" /> Cancel</Button></div>
        </div>}
      </div>
    </div>
  );
}