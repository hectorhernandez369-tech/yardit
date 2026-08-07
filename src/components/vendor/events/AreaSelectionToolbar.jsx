import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { Check, Trash2, Flag, Copy } from "lucide-react";
import { shapeBBoxPixels } from "@/lib/areaGeometry";
import { useMapRepaint } from "./useMapRepaint";

const BTN =
  "pointer-events-auto flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors";

export default function AreaSelectionToolbar({
  shape,
  onDelete,
  onDone,
  onAddFlag,
  onDuplicate,
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
  const transform = placeBelow
    ? "translate(-50%, 0)"
    : "translate(-50%, -100%)";

  return createPortal(
    <div
      data-no-map-click
      className="absolute z-[800]"
      style={{ left: bbox.cx, top, transform }}
    >
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-full border-2 border-[#2C4F4E] bg-white/95 p-1 shadow-lg">
        <span className="px-2 text-[11px] font-bold uppercase tracking-wide text-[#2C4F4E]">
          Drag · Resize
        </span>

        {onAddFlag && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAddFlag();
            }}
            className={`${BTN} bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]`}
            title="Add flag inside this shape"
          >
            <Flag className="h-4 w-4" />
            Add Flag
          </button>
        )}

        {onDuplicate && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
            className={`${BTN} bg-white text-[#2C4F4E] hover:bg-slate-100 border border-[#2C4F4E]/30`}
            title="Duplicate this shape"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
        )}

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDone();
          }}
          className={`${BTN} bg-[#5DADA5] text-white hover:bg-[#4A9B93]`}
        >
          <Check className="h-4 w-4" />
          Done
        </button>

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className={`${BTN} text-red-600 hover:bg-red-50`}
          title="Delete area"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>,
    container
  );
}