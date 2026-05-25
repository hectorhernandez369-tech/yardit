import React from "react";
import { Tags, Calendar, Store, Users, ChevronLeft } from "lucide-react";

const FILTERS = [
  {
    key: "yardSales",
    label: "Yard Sales",
    icon: Tags,
    activeColor: "bg-amber-500",
    activeDot: "bg-amber-400",
  },
  {
    key: "neighborhoodSales",
    label: "Neighborhood",
    icon: Users,
    activeColor: "bg-emerald-500",
    activeDot: "bg-emerald-400",
  },
  {
    key: "events",
    label: "Events",
    icon: Calendar,
    activeColor: "bg-[#006168]",
    activeDot: "bg-teal-400",
  },
  {
    key: "vendors",
    label: "Vendors",
    icon: Store,
    activeColor: "bg-violet-500",
    activeDot: "bg-violet-400",
  },
];

export default function QuickMapFilters({ value, onChange }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [position, setPosition] = React.useState({ right: 10, bottom: 72 });
  const dragRef = React.useRef(null);

  const toggleFilter = (key, currentValue) => {
    onChange({ ...value, [key]: !currentValue });
  };

  const startDrag = (e) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: position.right,
      startBottom: position.bottom,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e) => {
    if (!dragRef.current) return;
    const nextRight = Math.max(4, dragRef.current.startRight - (e.clientX - dragRef.current.startX));
    const nextBottom = Math.max(4, dragRef.current.startBottom - (e.clientY - dragRef.current.startY));
    setPosition({ right: nextRight, bottom: nextBottom });
  };

  const stopDrag = () => { dragRef.current = null; };

  const activeCount = FILTERS.filter(f => value[f.key] !== false).length;

  return (
    <div
      className="absolute z-[1001]"
      style={{ right: position.right, bottom: position.bottom }}
    >
      <div
        className={`
          bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60
          transition-all duration-300 ease-out overflow-hidden
          ${collapsed ? "w-10" : "w-44"}
        `}
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1.5">
          {!collapsed && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filters</span>
              {activeCount < FILTERS.length && (
                <span className="text-[9px] bg-[#006168] text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                  {activeCount}/{FILTERS.length}
                </span>
              )}
            </div>
          )}

          <div className={`flex items-center gap-1 ${collapsed ? "w-full justify-center" : "ml-auto"}`}>
            {/* Drag handle */}
            <button
              type="button"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-300 hover:text-slate-400 hover:bg-slate-100/80 transition-colors"
              aria-label="Drag filters"
            >
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="3" cy="2.5" r="1.2"/>
                <circle cx="7" cy="2.5" r="1.2"/>
                <circle cx="3" cy="7" r="1.2"/>
                <circle cx="7" cy="7" r="1.2"/>
                <circle cx="3" cy="11.5" r="1.2"/>
                <circle cx="7" cy="11.5" r="1.2"/>
              </svg>
            </button>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-colors"
              aria-label={collapsed ? "Expand filters" : "Collapse filters"}
            >
              <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        {!collapsed && (
          <div className="px-2 pb-2.5 space-y-1">
            {FILTERS.map(({ key, label, icon: Icon, activeColor, activeDot }) => {
              const isOn = value[key] !== false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFilter(key, isOn)}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left
                    transition-all duration-150 font-medium
                    ${isOn
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100/80 text-slate-400"
                    }
                  `}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isOn ? activeColor : "bg-slate-200"}`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[11px] leading-none whitespace-nowrap">{label}</span>
                  <div className={`ml-auto w-2 h-2 rounded-full shrink-0 transition-all ${isOn ? activeDot : "bg-slate-200"}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Collapsed state — show active dots */}
        {collapsed && (
          <div className="pb-2.5 px-2 flex flex-col items-center gap-1">
            {FILTERS.map(({ key, activeDot }) => {
              const isOn = value[key] !== false;
              return (
                <div
                  key={key}
                  className={`w-2 h-2 rounded-full transition-all ${isOn ? activeDot : "bg-slate-200"}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}