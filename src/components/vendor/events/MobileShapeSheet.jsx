import { Flag, Copy, Maximize2, Trash2, Check } from "lucide-react";

const BTN_BASE =
  "flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors select-none";

export default function MobileShapeSheet({
  shape,
  showAddFlag,
  onAddFlag,
  onDuplicate,
  onResize,
  onDelete,
  onDone,
}) {
  if (!shape) return null;

  return (
    <div
      data-no-map-click
      className="fixed inset-x-0 bottom-0 z-[1200] border-t-2 border-[#2C4F4E] bg-white/97 backdrop-blur px-3 pt-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(44,79,78,0.18)]"
    >
      <div className="mx-auto max-w-md">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#2C4F4E]/30"
            style={{ backgroundColor: shape.fillColor || "#F4A849" }}
          />
          <span className="truncate text-sm font-bold text-[#2C4F4E]">
            {shape.title?.trim() || "Selected Area"}
          </span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {shape.type}
          </span>
        </div>

        <div className={`grid gap-2 ${showAddFlag ? "grid-cols-5" : "grid-cols-4"}`}>
          {showAddFlag && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onAddFlag?.(); }}
              className={`${BTN_BASE} bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]`}
            >
              <Flag className="h-4 w-4" />
              Add Flag
            </button>
          )}

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
            className={`${BTN_BASE} bg-white text-[#2C4F4E] border border-[#2C4F4E]/30 hover:bg-slate-50`}
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onResize?.(); }}
            className={`${BTN_BASE} bg-white text-[#2C4F4E] border border-[#2C4F4E]/30 hover:bg-slate-50`}
          >
            <Maximize2 className="h-4 w-4" />
            Resize
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className={`${BTN_BASE} text-red-600 border border-red-200 bg-red-50 hover:bg-red-100`}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDone?.(); }}
            className={`${BTN_BASE} bg-[#5DADA5] text-white hover:bg-[#4A9B93]`}
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}