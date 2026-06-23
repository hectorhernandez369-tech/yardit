import React from "react";
import { Switch } from "@/components/ui/switch";
import { PUSH_RADIUS_OPTIONS } from "@/lib/pushNotifications";

export default function PushCategoryRow({ title, description, checked, onCheckedChange, radius, onRadiusChange, disabled, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-bold text-[#2C4F4E]">{title}</h4>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          {note && <p className="mt-2 text-xs font-semibold text-amber-700">{note}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
      {typeof radius === "number" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <span>Radius</span>
          <select
            value={radius}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            disabled={disabled || !checked}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {PUSH_RADIUS_OPTIONS.map((miles) => <option key={miles} value={miles}>{miles} mile{miles !== 1 ? "s" : ""}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}