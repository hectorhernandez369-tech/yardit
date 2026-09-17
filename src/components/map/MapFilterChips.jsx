import React from "react";
import { Tags, Calendar, Store, Users, Ghost } from "lucide-react";

const FILTERS = [
  { key: "yardSales", label: "Yard Sales", icon: Tags, active: "bg-amber-500 border-amber-600" },
  { key: "neighborhoodSales", label: "Neighborhood", icon: Users, active: "bg-emerald-600 border-emerald-700" },
  { key: "events", label: "Events", icon: Calendar, active: "bg-[#006168] border-[#004f55]" },
  { key: "vendors", label: "Vendors", icon: Store, active: "bg-violet-600 border-violet-700" },
  { key: "halloween", label: "Halloween", icon: Ghost, active: "bg-orange-500 border-orange-600" },
];

export default function MapFilterChips({ value, onChange }) {
  return (
    <div className="absolute left-0 right-0 top-3 z-[1001] overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-max min-w-full justify-start gap-2 sm:justify-center">
        {FILTERS.map(({ key, label, icon: Icon, active }) => {
          const isOn = value[key] !== false;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange({ ...value, [key]: !isOn })}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-md backdrop-blur-sm ${isOn ? `${active} text-white` : "border-slate-300 bg-white/90 text-slate-500"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}