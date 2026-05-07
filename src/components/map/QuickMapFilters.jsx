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
    <div className="absolute right-2 bottom-16 z-[1001] rounded-xl border border-[#2C4F4E]/20 bg-white/65 p-1.5 shadow-lg backdrop-blur-md sm:right-3 sm:bottom-20">
      <div className="space-y-1">
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <label key={key} className="flex min-h-7 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-[#2C4F4E] hover:bg-white/60">
            <Checkbox
              checked={value[key]}
              onCheckedChange={(checked) => toggleFilter(key, checked === true)}
              className="h-3.5 w-3.5 border-[#2C4F4E] bg-white/80"
            />
            <Icon className="h-3 w-3" />
            <span className="whitespace-nowrap">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}