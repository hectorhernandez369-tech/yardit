import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SLOTS = [["16:00", "18:00", "4–6 PM"], ["17:00", "19:00", "5–7 PM"], ["17:00", "20:00", "5–8 PM"], ["18:00", "20:00", "6–8 PM"], ["18:00", "21:00", "6–9 PM"], ["18:00", "22:00", "6–10 PM"]];

export default function HalloweenCandySchedule({ draft, setDraft, halloweenDate }) {
  const custom = draft.halloween_candy_schedule_mode === "custom";
  const setField = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));
  const setHalloween = (start, end) => setDraft(prev => ({ ...prev, halloween_candy_schedule_mode: "halloween_only", halloween_candy_start_date: halloweenDate, halloween_candy_end_date: halloweenDate, ...(start ? { halloween_candy_start_time: start, halloween_candy_end_time: end, halloween_candy_custom_time: false } : {}) }));

  return <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
    <Label>When will candy be available?</Label>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={!custom ? "default" : "outline"} onClick={() => setHalloween()}>Halloween Only — Oct. 31</Button>
      <Button type="button" size="sm" variant={custom ? "default" : "outline"} onClick={() => setField("halloween_candy_schedule_mode", "custom")}>Custom Dates & Times</Button>
    </div>
    {custom ? <div className="grid grid-cols-2 gap-2">
      <Field label="Candy start date" type="date" value={draft.halloween_candy_start_date} onChange={v => setField("halloween_candy_start_date", v)} />
      <Field label="Candy end date" type="date" value={draft.halloween_candy_end_date} min={draft.halloween_candy_start_date || undefined} onChange={v => setField("halloween_candy_end_date", v)} />
      <Field label="Candy starts" type="time" value={draft.halloween_candy_start_time} onChange={v => setField("halloween_candy_start_time", v)} />
      <Field label="Candy ends" type="time" value={draft.halloween_candy_end_time} onChange={v => setField("halloween_candy_end_time", v)} />
    </div> : <>
      <div className="flex flex-wrap gap-2">{SLOTS.map(([start, end, label]) => <Button type="button" key={label} size="sm" variant={draft.halloween_candy_start_time === start && draft.halloween_candy_end_time === end ? "default" : "outline"} onClick={() => setHalloween(start, end)}>{label}</Button>)}
        <Button type="button" size="sm" variant="outline" onClick={() => setDraft(prev => ({ ...prev, halloween_candy_schedule_mode: "halloween_only", halloween_candy_start_date: halloweenDate, halloween_candy_end_date: halloweenDate, halloween_candy_custom_time: true }))}>Custom time</Button>
      </div>
      {(draft.halloween_candy_custom_time || (draft.halloween_candy_start_time && !SLOTS.some(([start, end]) => start === draft.halloween_candy_start_time && end === draft.halloween_candy_end_time))) && <div className="grid grid-cols-2 gap-2">
        <Field label="Candy starts" type="time" value={draft.halloween_candy_start_time} onChange={v => setField("halloween_candy_start_time", v)} />
        <Field label="Candy ends" type="time" value={draft.halloween_candy_end_time} onChange={v => setField("halloween_candy_end_time", v)} />
      </div>}
    </>}
  </div>;
}

function Field({ label, value, onChange, ...props }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label><Input value={value || ""} onChange={e => onChange(e.target.value)} {...props} /></div>;
}