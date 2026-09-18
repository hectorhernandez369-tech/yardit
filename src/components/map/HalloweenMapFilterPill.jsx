import React from "react";
import { Ghost } from "lucide-react";

export default function HalloweenMapFilterPill({ enabled, onToggle }) {
  return (
    <div className="absolute left-1/2 top-3 z-[1001] -translate-x-1/2">
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => onToggle(!enabled)}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-md backdrop-blur-sm ${
          enabled
            ? "border-orange-600 bg-orange-500 text-white"
            : "border-slate-300 bg-white/90 text-slate-500"
        }`}
      >
        <Ghost className="h-3.5 w-3.5" />
        Halloween
      </button>
    </div>
  );
}