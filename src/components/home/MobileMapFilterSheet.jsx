import React from "react";
import { Calendar, SlidersHorizontal, Store, Tags, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const FILTERS = [
  { key: "yardSales", label: "Yard Sales", icon: Tags },
  { key: "neighborhoodSales", label: "Neighborhood", icon: Users },
  { key: "events", label: "Events", icon: Calendar },
  { key: "vendors", label: "Vendors", icon: Store },
];

export default function MobileMapFilterSheet({ open, onOpenChange, value, onChange, onAdvancedFilters }) {
  const toggleFilter = (key) => onChange({ ...value, [key]: value[key] === false });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="z-[1400] sm:hidden rounded-t-3xl border-0 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <SheetHeader className="text-left">
          <SheetTitle>Map Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {FILTERS.map(({ key, label, icon: Icon }) => {
            const isOn = value[key] !== false;
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  isOn ? "border-[#006168] bg-[#006168] text-white" : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          onClick={onAdvancedFilters}
          className="mt-4 h-12 w-full rounded-2xl border-slate-200 gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" /> More Filters
        </Button>
      </SheetContent>
    </Sheet>
  );
}