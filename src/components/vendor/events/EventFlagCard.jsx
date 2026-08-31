import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { getEventFlagIcon } from "@/lib/eventFlagIcons";

export default function EventFlagCard({ spot, selected, onEdit }) {
  const scheduleCount = spot.schedule_entries?.length || 0;

  return (
    <Card className={`rounded-2xl bg-white transition ${selected ? "border-[#5DADA5] ring-2 ring-[#5DADA5]/20" : "border-[#2C4F4E]/10"}`}>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex min-w-0 items-center gap-3 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2C4F4E] bg-[#F4A849] text-xl">{getEventFlagIcon(spot.icon_key)}</span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-[#2C4F4E]">{spot.title || spot.label || "Flag"}</span>
            <span className="block text-sm text-slate-500">{scheduleCount} schedule {scheduleCount === 1 ? "entry" : "entries"}</span>
          </span>
        </button>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" /> Quick Edit</Button>
      </CardContent>
    </Card>
  );
}