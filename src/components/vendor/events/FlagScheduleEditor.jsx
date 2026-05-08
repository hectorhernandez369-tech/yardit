import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Plus, Trash2 } from "lucide-react";

const makeId = () => `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const parseManualTime = (eventDate, value) => {
  if (!value?.trim()) return "";
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return value;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3];
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  const date = new Date(eventDate || new Date());
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const formatManualTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const offsetTime = (value, minutes, eventDate) => {
  const parsed = parseManualTime(eventDate, value);
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date.toISOString();
};

export default function FlagScheduleEditor({ entries = [], onChange, eventDate, timeBetweenMinutes, onTimeBetweenChange }) {
  const sortedEntries = [...entries].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const updateEntry = (id, patch) => {
    onChange(sortedEntries.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  };

  const addEntry = () => {
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    const nextStart = lastEntry?.start_time ? offsetTime(lastEntry.start_time, timeBetweenMinutes, eventDate) : "";
    onChange([...sortedEntries, { id: makeId(), title: "", start_time: nextStart, end_time: "", notes: "", sort_order: sortedEntries.length }]);
  };

  const duplicateEntry = (entry, index) => {
    const copy = { ...entry, id: makeId(), title: entry.title, start_time: offsetTime(entry.start_time, timeBetweenMinutes, eventDate), sort_order: index + 1 };
    const next = [...sortedEntries.slice(0, index + 1), copy, ...sortedEntries.slice(index + 1)]
      .map((item, itemIndex) => ({ ...item, sort_order: itemIndex }));
    onChange(next);
  };

  const deleteEntry = (id) => {
    onChange(sortedEntries.filter((entry) => entry.id !== id).map((entry, index) => ({ ...entry, sort_order: index })));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-[#FBFAF7] p-3">
        <div>
          <p className="font-bold text-[#2C4F4E]">Schedule Entries</p>
          <p className="text-xs text-slate-500">Type times like 12pm, 1:30pm, or 7:00 PM.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-[#2C4F4E]">
          Time Between Events
          <Input className="w-24 bg-white" type="number" value={timeBetweenMinutes} onChange={(e) => onTimeBetweenChange(e.target.value)} />
          minutes
        </label>
      </div>

      <div className="space-y-2">
        {sortedEntries.map((entry, index) => (
          <div key={entry.id} className="rounded-xl border bg-white p-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <Input placeholder="Activity/game/show title" value={entry.title || ""} onChange={(e) => updateEntry(entry.id, { title: e.target.value })} />
              <Input
                placeholder="12:00 PM"
                value={formatManualTime(entry.start_time)}
                onChange={(e) => updateEntry(entry.id, { start_time: e.target.value })}
                onBlur={(e) => updateEntry(entry.id, { start_time: parseManualTime(eventDate, e.target.value) })}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => duplicateEntry(entry, index)}><Copy className="h-4 w-4" /> Duplicate</Button>
                <Button type="button" variant="outline" size="icon" onClick={() => deleteEntry(entry.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addEntry}><Plus className="h-4 w-4" /> Add Entry</Button>
    </div>
  );
}