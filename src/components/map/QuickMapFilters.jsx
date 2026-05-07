import React from "react";
import { Calendar, Store, Tags } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const FILTERS = [
  { key: "yardSales", label: "Yard Sales", icon: Tags },
  { key: "events", label: "Events", icon: Calendar },
  { key: "vendors", label: "Vendors", icon: Store },
];

export default function QuickMapFilters({ value, onChange }) {
  const [position, setPosition] = React.useState({ right: 8, bottom: 64 });
  const dragRef = React.useRef(null);

  const toggleFilter = (key, checked) => {
    onChange({ ...value, [key]: checked });
  };

  const startDrag = (event) => {
    event.preventDefault();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startRight: position.right,
      startBottom: position.bottom,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragRef.current) return;
    const nextRight = Math.max(4, dragRef.current.startRight - (event.clientX - dragRef.current.startX));
    const nextBottom = Math.max(4, dragRef.current.startBottom - (event.clientY - dragRef.current.startY));
    setPosition({ right: nextRight, bottom: nextBottom });
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="absolute z-[1001] rounded-xl border border-[#2C4F4E]/20 bg-white/65 p-1.5 shadow-lg backdrop-blur-md"
      style={{ right: position.right, bottom: position.bottom }}
    >
      <button
        type="button"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        className="mb-1 flex h-4 w-full cursor-grab items-center justify-center rounded-md text-[9px] font-bold uppercase tracking-wide text-[#2C4F4E]/70 active:cursor-grabbing"
        aria-label="Drag map filters"
      >
        ⋮⋮
      </button>
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