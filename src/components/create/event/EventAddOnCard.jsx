import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

export default function EventAddOnCard({ title, price, description, selected, onToggle, children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(!selected)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle(!selected);
        }
      }}
      className={cn(
        "cursor-pointer bg-white transition-all",
        selected ? "bg-green-50 ring-2 ring-green-500/70" : "hover:bg-slate-50"
      )}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
            selected ? "border-green-600 bg-green-600 text-white" : "border-slate-300 bg-white text-transparent"
          )}>
            <Check className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-800">{title}</h4>
            <div className="mt-0.5 text-sm font-bold text-[#006168]">{money(price)}</div>
          </div>
        </div>

        <button
          type="button"
          aria-label={expanded ? "Collapse add-on details" : "Expand add-on details"}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronDown className={cn("h-5 w-5 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-4" onClick={(event) => event.stopPropagation()}>
          <div className="space-y-2 text-sm leading-relaxed text-slate-600">{description}</div>
          {selected && children && <div className="border-t border-slate-100 pt-4">{children}</div>}
        </div>
      )}
    </div>
  );
}