import { Card, CardContent } from "@/components/ui/card";
import { groupScheduleRows } from "@/lib/vendorEventSchedule";

const timeLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function PublicEventSchedule({ entries = [], grouped = true }) {
  const visibleEntries = [...entries].filter((entry) => entry.title && entry.start_time).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  if (!visibleEntries.length) return null;

  if (!grouped) {
    return <Card className="rounded-3xl bg-white"><CardContent className="p-5 sm:p-6 space-y-4"><h2 className="text-2xl font-black text-[#2C4F4E]">Event Schedule</h2>{visibleEntries.map((entry) => <div key={entry.id} className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3"><p className="font-black text-[#2C4F4E]">{entry.title}</p><p className="text-sm text-slate-700">{timeLabel(entry.start_time)}{entry.end_time ? ` - ${timeLabel(entry.end_time)}` : ""} · {entry.field_name}</p>{entry.notes && <p className="text-xs text-slate-500 mt-1">{entry.notes}</p>}</div>)}</CardContent></Card>;
  }

  const groups = groupScheduleRows(visibleEntries);
  return (
    <Card className="rounded-3xl bg-white">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <h2 className="text-2xl font-black text-[#2C4F4E]">Game Schedule</h2>
        {Object.entries(groups).map(([fieldName, rows]) => <div key={fieldName} className="space-y-2"><h3 className="rounded-xl bg-[#2C4F4E] px-4 py-2 font-black text-white">{fieldName}</h3>{rows.map((entry) => <div key={entry.id} className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-3"><p className="font-black text-[#2C4F4E]">{entry.title}</p><p className="text-sm text-slate-700">{timeLabel(entry.start_time)}{entry.end_time ? ` - ${timeLabel(entry.end_time)}` : ""}</p>{entry.notes && <p className="text-xs text-slate-500 mt-1">{entry.notes}</p>}</div>)}</div>)}
      </CardContent>
    </Card>
  );
}