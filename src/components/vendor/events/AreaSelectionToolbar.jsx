import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { Pencil, Move, Maximize, Trash2, Check, X } from "lucide-react";
import { shapeBBoxPixels } from "@/lib/areaGeometry";
import { useMapRepaint } from "./useMapRepaint";

const BTN = "pointer-events-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors";

// Floating action toolbar that appears near the selected highlighted area.
// In "move" mode it shows Edit / Move / Resize / Delete.
// In "resize" mode it shows Done / Cancel.
export default function AreaSelectionToolbar({
  shape,
  mode = "move",
  onEdit,
  onMove,
  onResize,
  onDelete,
  onDone,
  onCancel,
}) {
  const map = useMap();
  const container = map.getContainer();
  useMapRepaint();

  if (!shape) return null;
  const bbox = shapeBBoxPixels(map, shape);
  if (!bbox) return null;

  const aboveTop = bbox.top - 10;
  const placeBelow = aboveTop < 8;
  const top = placeBelow ? bbox.bottom + 10 : aboveTop;
  const transform = placeBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)";

  return createPortal(
    <div className="absolute z-[800]" style={{ left: bbox.cx, top, transform }}>
      <div className="flex items-center gap-1 rounded-full border-2 border-[#2C4F4E] bg-white/95 p-1 shadow-lg">
        {mode === "resize" ? (
          <>
            <span className="px-2 text-[11px] font-bold uppercase tracking-wide text-[#2C4F4E]">
              Drag handles to resize
            </span>
            <button type="button" onClick={onDone} className={`${BTN} bg-[#5DADA5] text-white hover:bg-[#4A9B93]`}>
              <Check className="h-3.5 w-3.5" /> Done
            </button>
            <button type="button" onClick={onCancel} className={`${BTN} text-red-600 hover:bg-red-50`}>
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className={`${BTN} text-[#2C4F4E] hover:bg-[#5DADA5]/15`} title="Edit details">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={onMove}
              className={`${BTN} ${mode === "move" ? "bg-[#2C4F4E] text-white" : "text-[#2C4F4E] hover:bg-[#5DADA5]/15"}`}
              title="Drag to move"
            >
              <Move className="h-3.5 w-3.5" /> Move
            </button>
            <button type="button" onClick={onResize} className={`${BTN} text-[#2C4F4E] hover:bg-[#5DADA5]/15`} title="Resize">
              <Maximize className="h-3.5 w-3.5" /> Resize
            </button>
            <button type="button" onClick={onDelete} className={`${BTN} text-red-600 hover:bg-red-50`} title="Delete area">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>,
    container
  );
}