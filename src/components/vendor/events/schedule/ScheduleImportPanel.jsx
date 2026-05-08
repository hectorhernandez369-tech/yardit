import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import ScheduleFormatGuide from "./ScheduleFormatGuide";
import { makeScheduleRowId, parseScheduleTime } from "@/lib/vendorEventSchedule";

const getValue = (row, keys) => {
  const found = Object.keys(row || {}).find((key) => keys.includes(key.trim().toLowerCase()));
  return found ? row[found] : "";
};

export default function ScheduleImportPanel({ fields, eventDate, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [assignments, setAssignments] = useState({});

  const fieldNames = useMemo(() => fields.map((field) => field.title.toLowerCase()), [fields]);
  const unmatched = useMemo(() => [...new Set(previewRows.filter((row) => row.warning).map((row) => row.field_name))], [previewRows]);

  const handleUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: { type: "object", properties: { Field: { type: "string" }, Activity: { type: "string" }, "Start Time": { type: "string" }, Notes: { type: "string" }, "End Time": { type: "string" }, Date: { type: "string" } } }
          }
        }
      }
    });
    const rows = Array.isArray(extracted.output) ? extracted.output : extracted.output?.rows || [];
    const mapped = rows.map((item, index) => {
      const fieldName = String(getValue(item, ["field", "flag", "area"]) || "Main Event").trim();
      const matchedField = fields.find((field) => field.title.toLowerCase() === fieldName.toLowerCase());
      const dateValue = getValue(item, ["date"]);
      return {
        id: makeScheduleRowId(),
        spot_id: matchedField?.id || "",
        field_name: matchedField?.title || fieldName,
        title: String(getValue(item, ["activity", "activity/game name", "game", "title"]) || "").trim(),
        start_time: parseScheduleTime(eventDate, String(getValue(item, ["start time", "start", "time"]) || ""), dateValue),
        end_time: parseScheduleTime(eventDate, String(getValue(item, ["end time", "end"]) || ""), dateValue),
        notes: String(getValue(item, ["notes", "note"]) || "").trim(),
        date: dateValue || "",
        sort_order: index,
        warning: !matchedField && !fieldNames.includes(fieldName.toLowerCase()) ? "Field not found" : "",
      };
    });
    setPreviewRows(mapped);
    setLoading(false);
  };

  const confirmImport = () => {
    const resolved = previewRows.map((row) => {
      const assignedId = assignments[row.field_name];
      const field = fields.find((item) => item.id === assignedId || item.title === assignedId);
      return { ...row, spot_id: field?.id || row.spot_id, field_name: field?.title || row.field_name, warning: "" };
    });
    const stillUnmatched = resolved.some((row) => !row.spot_id && fields.length > 1 && !fields.find((field) => field.title === row.field_name || field.id === row.spot_id));
    if (stillUnmatched) {
      toast.error("Please assign unmatched fields before importing.");
      return;
    }
    onConfirm(resolved);
    setPreviewRows([]);
    setAssignments({});
  };

  return (
    <div className="space-y-4">
      <ScheduleFormatGuide />
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><h3 className="font-black text-[#2C4F4E]">Upload Schedule File</h3><p className="text-sm text-slate-600">Upload .xlsx or .csv, preview it, then confirm import.</p></div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#F4A849] px-4 py-2 text-sm font-bold text-[#2C4F4E] hover:bg-[#E39635]"><Upload className="h-4 w-4" /> {loading ? "Reading..." : "Choose File"}<Input type="file" accept=".xlsx,.csv" className="hidden" disabled={loading} onChange={(e) => handleUpload(e.target.files?.[0])} /></label>
        </div>

        {previewRows.length > 0 && <div className="space-y-3">
          {unmatched.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2"><p className="font-bold text-amber-800">Field not found. Assign unmatched fields before saving.</p>{unmatched.map((name) => <div key={name} className="grid gap-2 sm:grid-cols-[1fr_220px]"><span className="text-sm font-semibold text-amber-900">{name}</span><Select value={assignments[name] || ""} onValueChange={(value) => setAssignments({ ...assignments, [name]: value })}><SelectTrigger className="bg-white"><SelectValue placeholder="Assign to field" /></SelectTrigger><SelectContent>{fields.map((field) => <SelectItem key={field.id || field.title} value={field.id || field.title}>{field.title}</SelectItem>)}</SelectContent></Select></div>)}</div>}
          <div className="max-h-80 overflow-auto rounded-xl border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#E7D7B8]"><tr>{["Field", "Activity", "Start Time", "End Time", "Notes", "Status"].map((heading) => <th key={heading} className="p-2 text-left">{heading}</th>)}</tr></thead><tbody>{previewRows.map((row) => <tr key={row.id} className="border-t"><td className="p-2">{row.field_name}</td><td className="p-2">{row.title}</td><td className="p-2">{row.start_time ? new Date(row.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</td><td className="p-2">{row.end_time ? new Date(row.end_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</td><td className="p-2">{row.notes}</td><td className="p-2 text-amber-700">{row.warning}</td></tr>)}</tbody></table></div>
          <div className="flex gap-2"><Button onClick={confirmImport}>Confirm Import</Button><Button variant="outline" onClick={() => setPreviewRows([])}><X className="h-4 w-4" /> Cancel</Button></div>
        </div>}
      </div>
    </div>
  );
}