import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2 } from "lucide-react";
import { buildBlankScheduleRows, formatTimeInput, groupScheduleRows, makeScheduleRowId, normalizeScheduleRows, offsetScheduleTime, parseScheduleTime } from "@/lib/vendorEventSchedule";

function ScheduleRow({ row, index, fields, eventDate, timeBetweenMinutes, onUpdate, onDuplicate, onDelete }) {
  return (
    <div className="grid gap-2 rounded-xl border bg-white p-3 lg:grid-cols-[180px_1fr_130px_130px_1fr_auto]">
      <Select value={row.spot_id || row.field_name || "main-event"} onValueChange={(value) => {
        const field = fields.find((item) => item.id === value || item.title === value);
        onUpdate(row.id, { spot_id: field?.id || "", field_name: field?.title || value });
      }}>
        <SelectTrigger><SelectValue placeholder="Field / Flag" /></SelectTrigger>
        <SelectContent>{fields.map((field) => <SelectItem key={field.id || field.title} value={field.id || field.title}>{field.title}</SelectItem>)}</SelectContent>
      </Select>
      <Input placeholder="Activity/Game Name" value={row.title || ""} onChange={(e) => onUpdate(row.id, { title: e.target.value })} />
      <Input placeholder="12:00 PM" value={formatTimeInput(row.start_time)} onChange={(e) => onUpdate(row.id, { start_time: e.target.value })} onBlur={(e) => onUpdate(row.id, { start_time: parseScheduleTime(eventDate, e.target.value, row.date) })} />
      <Input placeholder="End Time" value={formatTimeInput(row.end_time)} onChange={(e) => onUpdate(row.id, { end_time: e.target.value })} onBlur={(e) => onUpdate(row.id, { end_time: parseScheduleTime(eventDate, e.target.value, row.date) })} />
      <Input placeholder="Notes" value={row.notes || ""} onChange={(e) => onUpdate(row.id, { notes: e.target.value })} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="icon" title="Duplicate" onClick={() => onDuplicate(row, index)}><Copy className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="icon" title="Delete" onClick={() => onDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function ScheduleRowsEditor({ rows, setRows, fields, eventDate, timeBetweenMinutes, groupByField }) {
  const updateRow = (id, patch) => setRows(rows.map((row) => row.id === id ? { ...row, ...patch, isBlank: false } : row));
  const deleteRow = (id) => setRows(normalizeScheduleRows(rows.filter((row) => row.id !== id)));
  const duplicateRow = (row, index) => {
    const copy = { ...row, id: makeScheduleRowId(), start_time: offsetScheduleTime(row.start_time, timeBetweenMinutes, eventDate), end_time: row.end_time ? offsetScheduleTime(row.end_time, timeBetweenMinutes, eventDate) : "", isBlank: false };
    setRows(normalizeScheduleRows([...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)]));
  };
  const addOne = () => setRows([...rows, ...buildBlankScheduleRows(1, fields, eventDate, timeBetweenMinutes, rows.length, rows[rows.length - 1]?.start_time)]);

  if (groupByField) {
    const groups = groupScheduleRows(rows);
    return <div className="space-y-4">{Object.entries(groups).map(([fieldName, groupRows]) => <div key={fieldName} className="space-y-2"><h3 className="rounded-xl bg-[#2C4F4E] px-4 py-2 font-black text-white">{fieldName}</h3>{groupRows.map((row) => <ScheduleRow key={row.id} row={row} index={rows.findIndex((item) => item.id === row.id)} fields={fields} eventDate={eventDate} timeBetweenMinutes={timeBetweenMinutes} onUpdate={updateRow} onDuplicate={duplicateRow} onDelete={deleteRow} />)}</div>)}<Button type="button" variant="outline" onClick={addOne}><Plus className="h-4 w-4" /> Add 1 Slot</Button></div>;
  }

  return <div className="space-y-2">{rows.map((row, index) => <ScheduleRow key={row.id} row={row} index={index} fields={fields} eventDate={eventDate} timeBetweenMinutes={timeBetweenMinutes} onUpdate={updateRow} onDuplicate={duplicateRow} onDelete={deleteRow} />)}<Button type="button" variant="outline" onClick={addOne}><Plus className="h-4 w-4" /> Add 1 Slot</Button></div>;
}