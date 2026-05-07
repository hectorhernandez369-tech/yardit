import React from "react";
import { Calendar, Store, Tags } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const FILTERS = [
  { key: "yardSales", label: "Yard Sales", icon: Tags },
  { key: "events", label: "Events", icon: Calendar },
  { key: "vendors", label: "Vendors", icon: Store },
];

export default function QuickMapFilters({ value, onChange }) {
  const toggleFilter = (key, checked) => {
    onChange({ ...value, [key]: checked });
  };

  return (
    <div className="absolute right-3 bottom-28 z-[1001] rounded-2xl border border-[#2C4F4E]/20 bg-white/70 p-2 shadow-lg backdrop-blur-md sm:right-4 sm:bottom-32">
      <div className="space-y-1.5">
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <label key={key} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-[#2C4F4E] hover:bg-white/60">
            <Checkbox
              checked={value[key]}
              onCheckedChange={(checked) => toggleFilter(key, checked === true)}
              className="h-4 w-4 border-[#2C4F4E] bg-white/80"
            />
            <Icon className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}