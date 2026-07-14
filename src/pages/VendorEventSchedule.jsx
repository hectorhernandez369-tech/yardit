import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CalendarDays, Loader2, Plus, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ScheduleImportPanel from "@/components/vendor/events/schedule/ScheduleImportPanel";
import ScheduleRowsEditor from "@/components/vendor/events/schedule/ScheduleRowsEditor";
import { buildBlankScheduleRows, cleanRowsForSave, normalizeScheduleRows } from "@/lib/vendorEventSchedule";
import { safeBack } from "@/utils";
import { canManageSchedule as hasSchedulePermission } from "@/lib/eventCollaboration";

export default function VendorEventSchedule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventId = new URLSearchParams(window.location.search).get("id");
  const [rows, setRows] = useState([]);
  const [timeBetweenMinutes, setTimeBetweenMinutes] = useState(90);
  const [bulkCount, setBulkCount] = useState(20);
  const [customDivisions, setCustomDivisions] = useState([]);
  const [groupByField, setGroupByField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canManageSchedule, setCanManageSchedule] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const { data: events = [], isLoading } = useQuery({ queryKey: ["scheduleVendorEvent", eventId], queryFn: () => base44.entities.VendorEvent.filter({ id: eventId }), enabled: !!eventId, initialData: [] });
  const event = events[0];
  const { data: spots = [] } = useQuery({ queryKey: ["scheduleEventSpots", eventId], queryFn: () => base44.entities.EventSpot.filter({ event_id: eventId }, "display_order"), enabled: !!eventId, initialData: [] });
  const { data: savedEntries = [], isLoading: isLoadingEntries } = useQuery({ queryKey: ["eventScheduleEntries", eventId], queryFn: () => base44.entities.EventScheduleEntry.filter({ event_id: eventId }, "sort_order"), enabled: !!eventId, initialData: [] });
  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({ queryKey: ["scheduleEventCollaborators", eventId], queryFn: () => base44.entities.EventCollaborator.filter({ event_id: eventId }), enabled: !!eventId, initialData: [] });

  const baseFields = useMemo(() => {
    if (["multi_spot", "multi_location"].includes(event?.event_type) && spots.length) {
      return spots.map((spot, index) => ({ id: spot.id, title: spot.title || spot.label || `Field ${index + 1}` }));
    }
    return [{ id: "", title: "Main Event" }];
  }, [event?.event_type, spots]);

  const fields = useMemo(() => {
    const baseTitles = new Set(baseFields.map((field) => field.title.toLowerCase()));
    const divisions = customDivisions
      .filter((name) => name && !baseTitles.has(name.toLowerCase()))
      .map((name) => ({ id: name, title: name, isCustom: true }));
    return [...baseFields, ...divisions];
  }, [baseFields, customDivisions]);

  useEffect(() => {
    if (!event) return;
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) {
        setCanManageSchedule(false);
        setAccessChecked(true);
        return;
      }
      const user = await base44.auth.me();
      const byId = await base44.entities.VendorAccount.filter({ owner_user_id: user.id });
      const byEmail = await base44.entities.VendorAccount.filter({ owner_user_id: user.email });
      const organizationIds = [...byId, ...byEmail].map((account) => account.id);
      setCanManageSchedule(user.role === "admin" || hasSchedulePermission(event, collaborators, organizationIds));
      setAccessChecked(true);
    });
  }, [event, collaborators]);

  useEffect(() => {
    if (!event || isLoadingEntries || rows.length) return;
    if (savedEntries.length) {
      const baseTitles = new Set(baseFields.map((field) => field.title.toLowerCase()));
      const savedDivisions = [...new Set(savedEntries.map((entry) => entry.field_name).filter((name) => name && !baseTitles.has(name.toLowerCase())))];
      if (savedDivisions.length) setCustomDivisions((prev) => [...new Set([...prev, ...savedDivisions])]);
      setRows(savedEntries.map((entry) => ({ ...entry, isBlank: false })));
    } else {
      setRows(buildBlankScheduleRows(1, fields, event.startDateTime, timeBetweenMinutes));
    }
  }, [event, baseFields, fields, isLoadingEntries, rows.length, savedEntries, timeBetweenMinutes]);

  const addBulkSlots = () => {
    setRows([...rows, ...buildBlankScheduleRows(bulkCount, fields, event.startDateTime, timeBetweenMinutes, rows.length, rows[rows.length - 1]?.start_time)]);
  };

  const addCustomField = (rawName) => {
    const name = String(rawName || "").trim();
    if (!name) return "";
    const existing = fields.find((field) => field.title.toLowerCase() === name.toLowerCase());
    if (existing) return existing.title;
    setCustomDivisions((prev) => prev.some((item) => item.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]);
    setGroupByField(true);
    return name;
  };

  const importRows = (importedRows) => {
    setRows(normalizeScheduleRows([...rows.filter((row) => row.title || row.start_time), ...importedRows]));
    toast.success("Imported schedule added to rows. Review and save when ready.");
  };

  const saveSchedule = async () => {
    setSaving(true);
    const cleaned = cleanRowsForSave(rows, event.id);
    await Promise.all(savedEntries.map((entry) => base44.entities.EventScheduleEntry.delete(entry.id)));
    if (cleaned.length) await base44.entities.EventScheduleEntry.bulkCreate(cleaned);
    queryClient.invalidateQueries({ queryKey: ["eventScheduleEntries", eventId] });
    toast.success("Schedule saved");
    setSaving(false);
  };

  if (isLoading || loadingCollaborators || !accessChecked) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!event) return <div className="p-6 text-center">Event not found.</div>;
  if (!canManageSchedule) return <div className="p-6 text-center text-[#2C4F4E] font-bold">You do not have permission for this action.</div>;

  return (
    <div className="max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden p-3 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="outline" onClick={() => safeBack(navigate, `/VendorEventDashboard?id=${event.id}`)} className="bg-white w-fit"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={saveSchedule} disabled={saving} className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Schedule"}</Button>
      </div>

      <Card className="rounded-3xl bg-white">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div><h1 className="text-3xl font-black text-[#2C4F4E]">Schedule Manager</h1><p className="text-xl font-bold text-slate-800">{event.title}</p><p className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="h-4 w-4 text-[#F4A849]" /> {format(new Date(event.startDateTime), "PPp")} - {format(new Date(event.endDateTime), "PPp")}</p></div>
            <div className="grid w-full min-w-0 gap-3 sm:grid-cols-3 lg:max-w-[520px]">
              <label className="text-sm font-bold text-[#2C4F4E]">Time Between Events<Input className="mt-1" type="number" value={timeBetweenMinutes} onChange={(e) => setTimeBetweenMinutes(Number(e.target.value || 0))} /></label>
              <label className="text-sm font-bold text-[#2C4F4E]">Add Multiple Slots<Input className="mt-1" type="number" value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value || 0))} /></label>
              <div className="flex items-end"><Button type="button" variant="outline" onClick={addBulkSlots} className="w-full"><Plus className="h-4 w-4" /> Add Multiple Slots</Button></div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-[#2C4F4E]"><Switch checked={groupByField} onCheckedChange={setGroupByField} /> Group by Event / Location</label>
        </CardContent>
      </Card>

      <ScheduleRowsEditor rows={rows} setRows={setRows} fields={fields} eventDate={event.startDateTime} timeBetweenMinutes={timeBetweenMinutes} groupByField={groupByField} onAddField={addCustomField} />
      <ScheduleImportPanel fields={fields} eventDate={event.startDateTime} onConfirm={importRows} />
    </div>
  );
}