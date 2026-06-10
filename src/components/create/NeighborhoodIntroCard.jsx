import React, { useRef } from "react";
import { ChevronDown } from "lucide-react";

export default function NeighborhoodIntroCard({ emoji, title, expanded, onToggle, children }) {
  const touchStartRef = useRef(null);

  const handlePointerDown = (event) => {
    touchStartRef.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const handlePointerMove = (event) => {
    const start = touchStartRef.current;
    if (!start) return;

    const deltaX = Math.abs(event.clientX - start.x);
    const deltaY = Math.abs(event.clientY - start.y);
    if (deltaX > 8 || deltaY > 8) {
      start.moved = true;
    }
  };

  const handleClick = (event) => {
    event.stopPropagation();
    if (touchStartRef.current?.moved) return;
    onToggle?.();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#5DADA5]/25 bg-white/95 shadow-sm">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onToggle?.();
          }
        }}
        className="flex w-full touch-pan-y select-none items-center justify-between gap-3 p-3.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 max-h-10 max-w-10 shrink-0 items-center justify-center rounded-xl bg-[#5DADA5]/12 text-lg">
            {emoji}
          </span>
          <span className="text-sm font-black leading-tight text-[#2C4F4E]">{title}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#5DADA5] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-[#5DADA5]/15 bg-[#F9F4EA]/70 px-4 pb-4 pt-3 text-[13px] leading-relaxed text-slate-700">
          {children}
        </div>
      )}
    </section>
  );
}