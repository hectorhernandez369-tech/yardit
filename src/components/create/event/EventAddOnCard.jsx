import React, { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import EventMapAddOnPreview from "@/components/create/event/EventMapAddOnPreview";
import EventMediaAddOnPreview from "@/components/create/event/EventMediaAddOnPreview";
import { eventAddOnCopy } from "@/components/create/event/eventAddOnCopy";

const money = (cents) => Number(cents) === 0 ? "Included • No extra charge" : `$${(Number(cents || 0) / 100).toFixed(2)}`;

export default function EventAddOnCard({ id, title, price, description, selected, onToggle, children, previewData }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const copy = eventAddOnCopy[id];
  const Preview = ["flyer_upload", "photo_gallery"].includes(id) ? EventMediaAddOnPreview : EventMapAddOnPreview;
  return (
    <div className={cn("bg-card text-card-foreground", selected && "ring-2 ring-inset ring-primary")}>
      <div className="flex items-center gap-3 p-4">
        <button type="button" aria-pressed={selected} onClick={() => onToggle(!selected)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2", selected ? "border-primary bg-primary text-primary-foreground" : "border-input text-transparent")}><Check className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-sm font-bold text-primary">{money(price)}</span></span>
        </button>
        <button type="button" aria-label={`${expanded ? "Hide" : "Show"} ${title} details and options`} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(!expanded)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground"><ChevronDown className={cn("h-5 w-5", expanded && "rotate-180")} /></button>
      </div>
      {copy && <div className="space-y-3 px-4 pb-4"><p className="text-sm leading-relaxed text-muted-foreground">{copy.summary}</p><Preview kind={id} data={previewData} /><p className="text-[10px] text-muted-foreground">Illustrative preview • actual appearance may vary</p></div>}
      {expanded && <div id={detailsId} className="space-y-4 border-t px-4 py-4"><div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{copy && <p>{copy.details}</p>}{description}</div>{selected && children && <div className="border-t pt-4">{children}</div>}</div>}
    </div>
  );
}